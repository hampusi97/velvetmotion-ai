from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'local-output' / 'velvetmotion-local-windows.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in ['server.mjs', 'START-WINDOWS.cmd', 'README.txt']:
        data = (root / 'local' / name).read_bytes()
        if name.endswith('.cmd'):
            data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
        archive.writestr('VelvetMotion-Local/' + name, data)
    for file in sorted((root / 'out').rglob('*')):
        if file.is_file():
            archive.write(file, 'VelvetMotion-Local/website/' + file.relative_to(root / 'out').as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'VelvetMotion-Local/website/companion.html' in archive.namelist()
print(f'Windows local app packaged: {output.name} ({output.stat().st_size} bytes)')
