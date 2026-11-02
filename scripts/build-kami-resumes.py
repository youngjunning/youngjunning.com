#!/usr/bin/env python3
"""Render one public resume body with two role titles using Kami's resume template."""

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


def render(data: dict, head: str, title: str) -> str:
    content = data["content"]
    jobs = content["experience"]
    employment = "".join(
        '<div class="project"><div class="proj-head">'
        f'<span class="proj-name serif">{esc(job["company"])}</span>'
        f'<span class="proj-kind">· {esc(job["period"].replace("—", "–"))}</span></div>'
        '<div class="proj-lines">'
        f'<div class="proj-row"><div class="proj-label">岗位</div><div class="proj-text">{esc(job["role"])}</div></div>'
        + "".join(
            f'<div class="proj-row"><div class="proj-label">职责</div><div class="proj-text">{esc(detail)}</div></div>'
            for detail in job["details"]
        )
        + '</div></div>'
        for job in jobs
    )
    projects = "".join(project(item) for item in content["projects"])
    work = "".join(
        f'<div class="os-highlight">{esc(item)}</div>'
        for item in content.get("public_work", [])
    )
    skills = "".join(
        '<div class="skill-row" style="gap:1mm">'
        f'<div class="skill-label" style="width:9mm">{index:02d} ·</div>'
        f'<div class="skill-body">{esc(item)}</div></div>'
        for index, item in enumerate(content["skills"], 1)
    )
    technical = "".join(
        '<div class="skill-row" style="gap:1mm">'
        f'<div class="skill-label" style="width:9mm">{index:02d} ·</div>'
        f'<div class="skill-body">{esc(item)}</div></div>'
        for index, item in enumerate(content["technical"], 1)
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
        f'{esc(title)}</span><br>{esc(content["contact"])}</div></div>'
        + section("个人简介", f'<div class="summary">{esc(content["summary"])}</div>')
        + section("核心能力", skills)
        + section("工作经历", f'<div class="proj-lines">{employment}</div>')
        + section("技术实现", technical)
        + section("项目经历 · 近两年重点", projects, page_break=True)
        + section("开源贡献", work)
        + section("教育背景", education)
    )
    html_head = (
        head.replace("{{姓名}}", esc(content["name"]))
        .replace("{{摘要}}", esc(content["summary"][:100]))
        .replace("{{关键词}}", esc(title + "，Agent，软件工程"))
    )
    return html_head + "<body>\n" + body + "\n</body>\n</html>\n"


def main() -> None:
    template = KAMI_TEMPLATE.read_text(encoding="utf-8")
    head = template[: template.rfind("<body>")]
    data = json.loads((SOURCE / "role-resume.source.json").read_text(encoding="utf-8"))
    targets = {
        "AI 应用开发工程师": "杨俊宁_AI 应用开发工程师_简历.html",
        "AI Browser 开发工程师": "杨俊宁_Agent Browser 开发工程师_简历.html",
    }
    for title, filename in targets.items():
        (OUT / filename).write_text(render(data, head, title), encoding="utf-8")
        print(OUT / filename)


if __name__ == "__main__":
    main()
