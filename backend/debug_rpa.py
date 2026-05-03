"""
Debug script — roda o RPA SYOS com browser visível e logs detalhados.
Execute: python debug_rpa.py
"""

import io
import os
import sys
import tempfile
from datetime import date, timedelta

SYOS_URL = "https://suarede.syos.com.br/web/cards"
SYOS_USER = "ramon.fernandes"
SYOS_PASS = "RMN$van2409"


def last_week_range():
    today = date.today()
    monday = today - timedelta(days=today.weekday() + 7)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def step(msg):
    print(f"\n>>> {msg}", flush=True)


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright não instalado. Execute:\n  pip install playwright\n  playwright install chromium")
        sys.exit(1)

    monday, sunday = last_week_range()
    date_filter = f"{monday.strftime('%d/%m/%Y')} 00:00 - {sunday.strftime('%d/%m/%Y')} 23:00"
    print(f"Período: {date_filter}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,   # browser visível
            slow_mo=800,      # 800ms entre ações
        )
        page = browser.new_page()
        page.set_default_timeout(30_000)

        # ── Login ──────────────────────────────────────────────────────────
        step("Abrindo página de login...")
        page.goto(SYOS_URL, wait_until="domcontentloaded")
        page.wait_for_selector("#name", timeout=15_000)

        step("Preenchendo credenciais (type, tecla por tecla)...")
        page.click("#name")
        page.keyboard.type(SYOS_USER)
        print(f"    #name preenchido com: {page.input_value('#name')}")
        page.click("#pass")
        page.keyboard.type(SYOS_PASS)
        page.click("#signin-button")

        step("Aguardando login...")
        page.wait_for_load_state("networkidle", timeout=30_000)
        print(f"    URL após login: {page.url}")

        # ── Navegar para Relatórios ────────────────────────────────────────
        step("Clicando em 'Relatórios' no menu...")
        page.click("a.reports")
        page.wait_for_load_state("networkidle", timeout=15_000)
        print(f"    URL: {page.url}")

        # ── Análise por Período ────────────────────────────────────────────
        step("Clicando em 'Análise por Período'...")
        page.click('a[href*="/web/report/gross"]')
        page.wait_for_load_state("networkidle", timeout=15_000)
        page.wait_for_selector("#datepicker", timeout=10_000)
        print(f"    URL: {page.url}")

        # ── Preencher data ─────────────────────────────────────────────────
        step(f"Preenchendo datepicker com: '{date_filter}'")
        page.click("#datepicker", click_count=3)  # seleciona todo o texto
        page.keyboard.type(date_filter)
        page.keyboard.press("Tab")
        print(f"    Valor atual: {page.input_value('#datepicker')}")

        # ── Selecionar Recorrência ─────────────────────────────────────────
        step("Selecionando Recorrência = 10 Minutos...")
        page.wait_for_selector('[aria-labelledby="select2-interval-container"]', timeout=10_000)
        page.click('[aria-labelledby="select2-interval-container"]')
        page.wait_for_selector(".select2-results__option", timeout=8_000)
        options = page.locator(".select2-results__option").all_text_contents()
        print(f"    Opções disponíveis: {options}")
        page.click('li.select2-results__option:has-text("10 Minutos")')

        # Confirmar seleção
        selected = page.text_content('[aria-labelledby="select2-interval-container"] .select2-selection__rendered')
        print(f"    Selecionado: '{selected}'")

        # ── Gerar Excel ────────────────────────────────────────────────────
        step("Clicando em 'Gerar Excel'...")
        page.click("#export")

        # ── Aguarda 1 minuto para o servidor gerar o arquivo ──────────────
        step("Aguardando 60s para o servidor processar o relatório...")
        page.wait_for_timeout(60_000)

        # ── Gestão de Downloads ────────────────────────────────────────────
        step("Navegando para 'Gestão de Downloads'...")
        page.click('a[href*="downloads_manage"]')
        page.wait_for_load_state("networkidle", timeout=15_000)
        print(f"    URL: {page.url}")

        def spinner_gone() -> bool:
            """Retorna True quando o spinner da primeira linha sumiu (arquivo pronto)."""
            try:
                first = page.locator("tbody tr").first
                if first.count() == 0:
                    return False
                btn = first.locator("a.btn-generate-download-link")
                if btn.count() == 0:
                    return False
                icon_cls = btn.locator("i").first.get_attribute("class") or ""
                print(f"    Ícone: '{icon_cls}'")
                return "fa-spin" not in icon_cls
            except Exception as ex:
                print(f"    (erro: {ex})")
                return False

        # Polling: recarrega a cada 20s até spinner sumir (máx 15 tentativas = ~5 min)
        step("Verificando se arquivo está pronto (polling a cada 20s, máx 15x)...")
        ready = spinner_gone()
        for attempt in range(1, 16):
            if ready:
                break
            print(f"    Tentativa {attempt}/15 — ainda processando. Aguardando 20s...")
            page.wait_for_timeout(20_000)
            page.reload(wait_until="networkidle", timeout=15_000)
            ready = spinner_gone()

        if not ready:
            step("ERRO: arquivo não ficou pronto. Browser aberto 60s para inspeção manual.")
            page.wait_for_timeout(60_000)
            browser.close()
            return

        # ── Download ───────────────────────────────────────────────────────
        step("Arquivo pronto! Clicando para baixar...")
        excel_path = None
        try:
            with page.expect_download(timeout=60_000) as dl_info:
                page.locator("tbody tr").first.locator("a.btn-generate-download-link").click()
            download = dl_info.value
            step(f"Download: {download.suggested_filename}")

            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
                download.save_as(tmp.name)
                excel_path = tmp.name
                size = os.path.getsize(tmp.name)
                step(f"Salvo em: {excel_path} ({size:,} bytes)")
        except Exception as e:
            step(f"ERRO no download: {e}")
            page.wait_for_timeout(30_000)

        browser.close()

    # ── Importar no Django ─────────────────────────────────────────────────
    if excel_path:
        step("Importando Excel no banco Django...")
        try:
            import django
            import os as _os
            _os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
            django.setup()
            from apps.sensors.importer import import_syos_excel
            with open(excel_path, "rb") as f:
                result = import_syos_excel(f.read(), user=None)
            os.unlink(excel_path)
            step(f"Importação concluída: {result}")
        except Exception as e:
            step(f"ERRO na importação: {e}")
            step(f"Arquivo Excel mantido em: {excel_path}")

    step("Fluxo completo concluído!")


if __name__ == "__main__":
    main()
