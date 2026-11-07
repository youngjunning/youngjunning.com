"""Package a site reader wrapper and its canonical, vendored read-only core."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

FILES = ("SKILL.md", "agents/openai.yaml", "scripts/read.mjs", "scripts/read-core.mjs", "references/api.md")


def package(source: Path, output: Path, reader_source: Path | None = None):
    source = source.resolve()
    directory = source.name
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", directory):
        raise ValueError("Invalid Skill directory")
    payload = {}
    for name in FILES:
        file = source / name
        if file.is_symlink() or not file.is_file() or not file.resolve().is_relative_to(source):
            raise ValueError(f"Missing or non-local Skill file: {name}")
        payload[name] = file.read_bytes()
    match = re.search(r"^name: ([a-z0-9]+(?:-[a-z0-9]+)*)$", payload["SKILL.md"].decode(), re.MULTILINE)
    if not match:
        raise ValueError("Skill name required")
    if reader_source and payload["scripts/read-core.mjs"] != reader_source.read_bytes():
        raise ValueError("Vendored reader differs from canonical personal-records-reader")
    output.mkdir(parents=True, exist_ok=True)
    archive = output / (directory + ".zip")
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, data in payload.items():
            entry = zipfile.ZipInfo(directory + "/" + name, date_time=(2020, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            bundle.writestr(entry, data)
    data = archive.read_bytes()
    manifest = {"version": 1, "name": match.group(1), "directory": directory,
                "archiveUrl": "/skills/" + directory + ".zip", "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data), "files": [{"path": name, "sha256": hashlib.sha256(body).hexdigest()}
                                             for name, body in payload.items()]}
    (output / (directory + ".json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/skills")
    parser.add_argument("--reader-source", type=Path, help="Verify the vendored core against its canonical script")
    args = parser.parse_args()
    print(json.dumps(package(args.source, args.output, args.reader_source), ensure_ascii=False))
