#!/usr/bin/env python3
"""Render the two public resume sources with Kami's unmodified resume stylesheet."""

from __future__ import annotations

import html
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KAMI_TEMPLATE = Path(
    os.environ.get(
        "KAMI_RESUME_TEMPLATE",
        str(Path.home() / ".codex/skills/kami/assets/templates/resume.html"),
    )
)
OUT = ROOT / "public/resumes"
SOURCE = ROOT / "content/resumes"


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def section(title: str, body: str, *, page_break: bool = False) -> str:
    cls = ' class="page-break"' if page_break else ""
    return f'<section{cls}><div class="section-title">{esc(title)}</div>{body}</section>'


def project(item: dict) -> str:
    rows = [("角色", item["role"])]
    rows.extend(("动作", action) for action in item["actions"])
    rows.append(("结果", item["impact"]))
    lines = "".join(
        f'<div class="proj-row"><div class="proj-label">{label}</div>'
        f'<div class="proj-text">{esc(value)}</div></div>'
        for label, value in rows
    )
    return (
        '<div class="project"><div class="proj-head">'
        f'<span class="proj-name serif">{esc(item["name"])}</span>'
        f'<span class="proj-kind">· {esc(item["period"])}</span>'
        '</div><div class="proj-lines">'
        f'{lines}</div></div>'
    )


def render(data: dict, head: str) -> str:
    content = data["content"]
    metrics = "".join(
        '<div class="metric">'
        f'<span class="metric-value serif">{esc(item["value"])}</span>'
        f'<span class="metric-label">{esc(item["label"])}</span></div>'
        for item in content["metrics"]
    )
    timeline = "".join(
        '<div class="tl-step"><div class="tl-top">'
        f'<div class="tl-year serif">{esc(item["period"])}</div></div>'
        f'<div class="tl-body">{esc(item["milestone"])}</div></div>'
        for item in content["timeline"]
    )
    jobs = json.loads((ROOT / "content/resume.json").read_text())["experience"]
    employment = "".join(
        '<div class="proj-row"><div class="proj-text">'
        f'{esc(job["company"])} · {esc(job["role"])} · {esc(job["period"].replace("—", "–"))}'
        '</div></div>'
        for job in jobs
    )
    split = (len(content["projects"]) + 1) // 2
    first = "".join(project(item) for item in content["projects"][:split])
    second = "".join(project(item) for item in content["projects"][split:])
    work = "".join(
        f'<div class="os-highlight">{esc(item)}</div>'
        for item in content.get("public_work", [])
    )
    skills = "".join(
        '<div class="skill-row">'
        f'<div class="skill-label">{index:02d} ·</div>'
        f'<div class="skill-body">{esc(item)}</div></div>'
        for index, item in enumerate(content["skills"], 1)
    )
    education = "".join(
        '<div class="edu-row"><div>'
        f'<span class="school serif">{esc(item["school"])}</span>'
        f'<span class="major"> · {esc(item["degree"])}</span>'
        f'</div><div class="date">{esc(item["period"])}</div></div>'
        for item in content["education"]
    )
    body = (
        '<div class="header"><div class="name serif">'
        f'{esc(content["name"])}</div>'
        '<div class="contact"><span class="role">'
        f'{esc(content["title"])}</span><br>{esc(content["contact"])}</div></div>'
        f'<div class="metrics">{metrics}</div>'
        + section("个人简介", f'<div class="summary">{esc(content["summary"])}</div>')
        + section("工作经历", f'<div class="proj-lines">{employment}</div>')
        + section("发展路径", f'<div class="timeline">{timeline}</div>')
        + section("代表项目", first)
        + section("工程项目与能力" if content["title"].startswith("AI 应用") else "Agent 与工程化", second, page_break=True)
        + section("开源贡献", work)
        + section("核心能力", skills)
        + section("教育背景", education)
    )
    html_head = (
        head.replace("{{姓名}}", esc(content["name"]))
        .replace("{{摘要}}", esc(content["summary"][:100]))
        .replace("{{关键词}}", esc(content["title"] + "，Agent，软件工程"))
    )
    return html_head + "<body>\n" + body + "\n</body>\n</html>\n"


def main() -> None:
    template = KAMI_TEMPLATE.read_text(encoding="utf-8")
    head = template[: template.rfind("<body>")]
    targets = {
        "ai-application": "junning-ai-application.html",
        "ai-browser": "junning-ai-browser.html",
    }
    for name, filename in targets.items():
        data = json.loads((SOURCE / f"{name}.content.json").read_text(encoding="utf-8"))
        (OUT / filename).write_text(render(data, head), encoding="utf-8")
        print(OUT / filename)


if __name__ == "__main__":
    main()
