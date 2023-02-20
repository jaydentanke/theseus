from __future__ import annotations
from pathlib import Path
import asyncio
import aionotify
from aionotify import Flags
import click

DEFAULT_INOTIFY_FLAG = Flags.CREATE | Flags.MODIFY

def watch_targets(base: Path, ignore: set[Path] | None=None) -> set[Path]:
    # bfs while respecting ignore
    ret = set()
    next: list[Path] = [base]
    while next:
        _next = []
        for d in next:
            for p in d.iterdir():
                if not p.is_dir():
                    continue

                if ignore is not None and p in ignore:
                    continue

                ret.add(p)
                _next.append(p)
            
        next = _next

    return ret



async def watcher(watchdir: Path, ignore: set[Path] | None):
    targets = watch_targets(watchdir, ignore)
    watcher = aionotify.Watcher()
    for target in targets:
        print(f"Watch: {target}")
        watcher.watch(alias=str(target), path=str(target), flags=DEFAULT_INOTIFY_FLAG)

    loop = asyncio.get_event_loop()
    await watcher.setup(loop)
    while True:
        event = await watcher.get_event()
        print(event)

@click.command()
@click.argument('watchdir', type=click.Path(exists=True, path_type=Path,))
@click.option('--ignore', multiple=True, type=click.Path(exists=True, path_type=Path,))
def main(watchdir: Path, ignore: tuple[Path] | None) -> None:
    print(f'Ignoring {ignore}')

    # Cast ignore
    if ignore is not None:
        _ignore = set(ignore)
    else:
        _ignore = None

    asyncio.run(watcher(watchdir, _ignore))


if __name__ == '__main__':
    main()