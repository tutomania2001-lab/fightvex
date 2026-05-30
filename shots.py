from playwright.sync_api import sync_playwright

PAGES = [
    ("/", "home"),
    ("/fighters", "fighters"),
    ("/fighters/diego-morales", "fighter-profile"),
    ("/events/vanguard-fc-14", "event"),
    ("/simulator", "simulator"),
    ("/betting", "betting"),
    ("/research", "research"),
    ("/pricing", "pricing"),
]
OUT = r"D:\UserData\Admin\Desktop\fightvector\shots"
BASE = "http://localhost:3100"

import os
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    # dismiss age gate by pre-setting localStorage
    page.goto(BASE)
    page.evaluate("localStorage.setItem('fv-age-ok','1')")
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    for path, name in PAGES:
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUT}\\{name}.png", full_page=True)
        print(f"shot: {name}")
    browser.close()
    if errors:
        print("CONSOLE ERRORS:", errors[:10])
    else:
        print("NO CONSOLE ERRORS")
