#!/usr/bin/env python3
"""Package the CI-tested SBF and committed IDL; does not build or deploy."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def main():
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    if os.environ.get("GITHUB_SHA") != sha or os.environ.get("GITHUB_ACTIONS") != "true":
        raise SystemExit("Run this packaging step in CI after the SBF integration tests.")
    # Fail rather than label modified sources with the checked-out commit.
    subprocess.run(["git", "diff", "--exit-code", "HEAD", "--"], cwd=ROOT, check=True)
    binary = ROOT / "solana/oxark/target/deploy/oxark.so"
    if binary.read_bytes()[:4] != b"\x7fELF":
        raise SystemExit("Missing ELF program header")
    output = ROOT / "tested-program"
    output.mkdir(exist_ok=False)
    files = {}
    for source in (binary, ROOT / "solana/client/oxark-idl.json"):
        destination = output / source.name
        shutil.copyfile(source, destination)
        data = destination.read_bytes()
        files[source.name] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    manifest = {
        "sourceCommit": sha,
        "repository": os.environ["GITHUB_REPOSITORY"],
        "ref": os.environ["GITHUB_REF"],
        "event": os.environ["GITHUB_EVENT_NAME"],
        "runUrl": f'https://github.com/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{os.environ["GITHUB_RUN_ID"]}',
        "runAttempt": os.environ["GITHUB_RUN_ATTEMPT"],
        "network": "devnet",
        "programId": "5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN",
        "idlOrigin": "committed client IDL, checked against program instructions",
        "files": files,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    checksums = []
    for path in sorted(output.iterdir()):
        checksums.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")
    (output / "SHA256SUMS").write_text("".join(checksums))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
