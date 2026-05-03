"""
SYOS RPA — Playwright headless: gera Excel semanal, aguarda processamento,
baixa o arquivo e importa automaticamente no banco Django.

Requires: pip install playwright && python -m playwright install chromium
"""

import os
import tempfile
from datetime import date, timedelta

from .importer import import_syos_excel

SYOS_URL  = "https://suarede.syos.com.br/web/cards"
SYOS_USER = "ramon.fernandes"
SYOS_PASS = "RMN$van2409"

# Tempo (ms) de espera após clicar "Gerar Excel" antes de ir para downloads
EXPORT_WAIT_MS = 60_000  # 1 minuto — servidor processa o relatório

# Intervalo (ms) entre cada recarga da página de downloads
POLL_INTERVAL_MS = 20_000  # 20 segundos

# Máximo de recargas aguardando o arquivo ficar pronto
POLL_MAX_ATTEMPTS = 15   # 15 × 20s = 5 minutos


def _last_week_range():
    today = date.today()
    monday = today - timedelta(days=today.weekday() + 7)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _current_week_range():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _is_download_ready(page) -> bool:
    """
    Verifica se a primeira linha da tabela de downloads tem o botão disponível
    (spinner sumiu — ícone não contém 'fa-spin').
    """
    try:
        first_row = page.locator("tbody tr").first
        if first_row.count() == 0:
            return False
        btn = first_row.locator("a.btn-generate-download-link")
        if btn.count() == 0:
            return False
        icon_cls = btn.locator("i").first.get_attribute("class") or ""
        return "fa-spin" not in icon_cls
    except Exception:
        return False


def run_syos_rpa(user=None, monday=None, sunday=None) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "Playwright não está instalado. Execute:\n"
            "  pip install playwright\n"
            "  python -m playwright install chromium"
        )

    if monday is None or sunday is None:
        monday, sunday = _last_week_range()
    date_filter = (
        f"{monday.strftime('%d/%m/%Y')} 00:00 - {sunday.strftime('%d/%m/%Y')} 23:00"
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(30_000)

        # ── Login ──────────────────────────────────────────────────────────
        page.goto(SYOS_URL, wait_until="networkidle")
        page.wait_for_selector("#name", timeout=15_000)
        page.click("#name")
        page.keyboard.type(SYOS_USER)
        page.click("#pass")
        page.keyboard.type(SYOS_PASS)
        page.click("#signin-button")
        page.wait_for_load_state("networkidle")

        # ── Relatórios → Análise por Período ──────────────────────────────
        page.click("a.reports")
        page.wait_for_load_state("networkidle")
        page.click('a[href*="/web/report/gross"]')
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("#datepicker", timeout=10_000)

        # ── Preencher data ─────────────────────────────────────────────────
        page.click("#datepicker", click_count=3)
        page.keyboard.type(date_filter)
        page.keyboard.press("Tab")

        # ── Recorrência = 10 Minutos (select2) ────────────────────────────
        page.click('[aria-labelledby="select2-interval-container"]')
        page.wait_for_selector(".select2-results__option", timeout=8_000)
        page.click('li.select2-results__option:has-text("10 Minutos")')

        # ── Gerar Excel ────────────────────────────────────────────────────
        page.click("#export")

        # Aguarda 1 minuto para o servidor processar antes de verificar downloads
        page.wait_for_timeout(EXPORT_WAIT_MS)

        # ── Gestão de Downloads ────────────────────────────────────────────
        page.click('a[href*="downloads_manage"]')
        page.wait_for_load_state("networkidle")

        # Polling: recarrega a página até o spinner sumir (arquivo pronto)
        ready = _is_download_ready(page)
        for _ in range(POLL_MAX_ATTEMPTS):
            if ready:
                break
            page.wait_for_timeout(POLL_INTERVAL_MS)
            page.reload(wait_until="networkidle", timeout=15_000)
            ready = _is_download_ready(page)

        if not ready:
            browser.close()
            raise RuntimeError(
                "Timeout: o arquivo de download não ficou pronto após "
                f"{EXPORT_WAIT_MS // 1000 + POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS // 1000}s."
            )

        # ── Baixar arquivo ─────────────────────────────────────────────────
        with page.expect_download(timeout=60_000) as dl_info:
            page.locator("tbody tr").first.locator("a.btn-generate-download-link").click()
        download = dl_info.value

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            download.save_as(tmp.name)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            excel_bytes = f.read()
        os.unlink(tmp_path)
        browser.close()

    # ── Importar no banco Django ───────────────────────────────────────────
    return import_syos_excel(excel_bytes, user=user)
