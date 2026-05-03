"""
Extrai campos do certificado de calibração TECNOCERT em PDF.
Os campos buscados correspondem ao layout do certificado D 38.768/25.
"""
import re
from typing import Optional
import pdfplumber


def _clean(value: Optional[str]) -> str:
    if not value:
        return ""
    return value.strip()


def _find(pattern: str, text: str, group: int = 1) -> str:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return _clean(match.group(group))
    return ""


def extract_certificate_data(pdf_path: str) -> dict:
    """
    Extrai os dados relevantes de um PDF de certificado de calibração TECNOCERT.
    Retorna um dict com as chaves correspondentes aos campos do modelo CalibrationCertificate.
    """
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
    except Exception as exc:
        return {"raw_extracted_text": "", "error": str(exc)}

    data = {"raw_extracted_text": text}

    # N.º do Certificado  — ex: "Certificado: D 38.768/25" ou aparece no header
    data["certificate_number"] = (
        _find(r"Certificado[:\s#]+([A-Z]\s*[\d.]+[/-]\d+)", text)
        or _find(r"N[ºo°]\.?\s*Certificado[:\s]+([^\n]+)", text)
        or _find(r"Certificado\s+(D\s*[\d.]+[/-]\d+)", text)
    )

    # Data de emissão — ex: "Data: 26/05/2025" ou "Data de Calibra[çc]ão: ..."
    raw_date = (
        _find(r"Data\s*de\s*Calibra[çc][aã]o[:\s]+(\d{2}/\d{2}/\d{4})", text)
        or _find(r"Data[:\s]+(\d{2}/\d{2}/\d{4})", text)
    )
    data["issue_date"] = _parse_br_date(raw_date)

    # Validade
    validity_raw = _find(r"Validade[:\s]+([\d]+)\s*[Mm]es", text)
    data["validity_months"] = int(validity_raw) if validity_raw.isdigit() else 12

    # Status (Aprovado / Reprovado)
    data["calibration_status"] = _find(r"Status[:\s]+([A-Za-záéíóúâêôãõ]+)", text)

    # Solicitante
    data["requestor"] = _find(r"Solicitante[:\s]+([^\n]+)", text)

    # Material / tipo
    data["material_type"] = (
        _find(r"Material[:\s]+([^\n]+)", text)
        or _find(r"Descri[çc][aã]o[:\s]+([^\n]+)", text)
    )

    # Fabricante / Marca
    data["manufacturer"] = (
        _find(r"Fabricante[:\s]+([^\n]+)", text)
        or _find(r"Marca[:\s]+([^\n]+)", text)
    )

    # Modelo
    data["model"] = _find(r"Modelo[:\s]+([^\n]+)", text)

    # N.º de Série
    data["serial_number"] = (
        _find(r"N[ºo°]\.?\s*[Ss][eé]rie[:\s]+([^\n]+)", text)
        or _find(r"N[ºo°]\.?\s*S[eé]r\.?[:\s]+([^\n]+)", text)
        or _find(r"Serial[:\s]+([^\n]+)", text)
    )

    # Identificação
    data["identification"] = _find(r"Identifica[çc][aã]o[:\s]+([^\n]+)", text)

    # Faixa de medição
    data["measurement_range"] = (
        _find(r"Faixa\s+de\s+Medi[çc][aã]o[:\s]+([^\n]+)", text)
        or _find(r"Range[:\s]+([^\n]+)", text)
    )

    # Resolução
    data["resolution"] = _find(r"Resolu[çc][aã]o[:\s]+([^\n]+)", text)

    return data


def _parse_br_date(raw: str):
    """Converte 'DD/MM/YYYY' para objeto date ou None."""
    if not raw:
        return None
    try:
        from datetime import datetime
        return datetime.strptime(raw.strip(), "%d/%m/%Y").date()
    except ValueError:
        return None
