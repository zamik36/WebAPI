from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import re
import anyio

app = FastAPI()


# --- Модели данных для запроса и ответа ---
class RegexRequest(BaseModel):
    pattern: str
    text: str
    flags: List[str] = []


class MatchResult(BaseModel):
    match: str
    groups: List[str]
    start: int
    end: int


# --- Маппинг строк флагов в константы re ---
FLAG_MAP = {
    "IGNORECASE": re.IGNORECASE,
    "MULTILINE": re.MULTILINE,
    "DOTALL": re.DOTALL,
    "VERBOSE": re.VERBOSE,
}


# --- Логика обработки регулярных выражений ---
def run_regex_finditer(pattern: str, text: str, flag_names: List[str]):
    """
    Синхронная операция поиска regex, учитывающая флаги.
    Выполняется в отдельном потоке.
    """
    combined_flags = 0
    for flag_name in flag_names:
        flag_constant = FLAG_MAP.get(flag_name)
        if flag_constant is not None:
            combined_flags |= flag_constant
        else:
            print(f"Warning: Unknown flag received: {flag_name}")

    regex = re.compile(pattern, combined_flags)

    return list(regex.finditer(text))


@app.post("/debug/")
async def debug_regex(request: RegexRequest) -> List[MatchResult]:
    results = []
    try:
        matches = await anyio.to_thread.run_sync(
            run_regex_finditer,
            request.pattern,
            request.text,
            request.flags
        )

        for match in matches:
            groups = list(match.groups())
            results.append(MatchResult(
                match=match.group(0),
                groups=groups,
                start=match.start(),
                end=match.end()
            ))

    except re.error as e:
        raise HTTPException(status_code=400, detail=f"Invalid regex pattern: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")

    return results

# --- Отдаем статические файлы ---
app.mount("/", StaticFiles(directory="static", html=True), name="static")