from __future__ import annotations
from pathlib import Path
import sys
import asyncio
import websockets
from uuid import UUID
from watchfiles import awatch
from typing import Any

import json
import click
from aiotools.taskgroup import TaskGroup
import attrs
import subprocess

@attrs.define
class Connection:
    uuid: UUID
    ws: websockets.ServerProtocol # type: ignore
    queue: asyncio.Queue = attrs.field(factory=asyncio.Queue)

    _tasks: set[asyncio.Task] = attrs.field(factory=set)

    @classmethod
    def from_ws(cls, ws):
        return cls(uuid=ws.id, ws=ws)

    # TODO: change to concrete change type
    def create_send_task(self, data: str):
        task = asyncio.create_task(self.ws.send(data))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

def dump_changes(changes: Any):
    res = []
    for change, fname in changes:
        res.append({
            'change': change.name,
            'file': fname
        })

    return json.dumps(res)


connections: dict[UUID, Connection] = {} # type: ignore
async def watcher(watchdir: Path, ignore: set[Path] | None):
    # TODO: ignore paths
    async for changes in awatch(watchdir):
        data = dump_changes(changes)
        for conn in connections.values():
            conn.create_send_task(data)


async def echo(ws: websockets.ServerProtocol): # type: ignore
    q = connections[ws.id] = Connection.from_ws(ws)
    print(f"New connection {ws.id}")

    if ws.id not in connections:
        print(f'New connection {ws.id}')
        await ws.send(f"Welcome {ws.id}")

    await ws.wait_closed()

    del connections[ws.id]
    print(f"Disconnected {ws.id}")

async def websocket_server():
    async with websockets.serve(echo, "localhost", 8765):
        await asyncio.Future()  # run forever

async def start_all_tasks(watchdir: Path, ignore: set[Path] | None):
    async with TaskGroup() as tg:
        tg.create_task(watcher(watchdir, ignore))
        tg.create_task(websocket_server())
        tg.create_task(asyncio.create_subprocess_shell(" ".join([sys.executable, '-m', 'http.server', '--bind', '127.0.0.1', '--directory', str(watchdir), '8764'])))

@click.command()
@click.argument('watchdir', type=click.Path(exists=True, path_type=Path,))
@click.option('--ignore', multiple=True, type=click.Path(exists=True, path_type=Path,))
def main(watchdir: Path, ignore: tuple[Path] | None) -> None:
    # Cast ignore
    if ignore is not None:
        _ignore = set(ignore)
    else:
        _ignore = None

    asyncio.run(start_all_tasks(watchdir, _ignore))

if __name__ == '__main__':
    main()