import chokidar from 'chokidar';
import express from 'express';
import expressWs from 'express-ws';
const app = express()
const expressWsInstance = expressWs(app);

import cors from 'cors';
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import remarkEmoji from 'remark-emoji';
import rehypeToc from 'rehype-toc';
import { parseArgs } from 'node:util'
import path from 'node:path';
import { read, toVFile } from 'to-vfile';


const {
    values,
    positionals,
} = parseArgs({
    allowPositionals: true
});

if (positionals.length != 1) {
    console.log("Need to provide watch directory.");
    process.exit(1);
}
const watchdir = positionals[0];

const port = 4000

/** Markdown -> HTML Endpoint **/
app.use(cors());
app.get(['/page', '/page/*'], async (req, res) => {
    let p = null;
    if (req.originalUrl == '/page') {
        p = 'index.md';
    } else {
        p = req.originalUrl.substring(6);
    }

    const rawPath = path.join(watchdir, p);
    console.log(rawPath);

    try {
        const items = [];
        const processor = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkEmoji)
            .use(remarkRehype)
            .use(rehypeSlug)
            .use(rehypeToc, {
                nav: true,
                // customizeTOCItem: (toc, heading) => {
                //     items.push({ toc, heading });
                //     return false;
                // },
                // customizeTOC: (toc) => {return false;}
            })
            // .use(rehypeSanitize)
            .use(rehypeStringify)
        const file = await processor.process(await read(rawPath));
        // for (const item of items) {
        //     console.log(item.heading.properties);
        // }
        res.send(String(file));
    } catch (err: any) {
        if (err.code == 'ENOENT') {
            res.sendStatus(404);
            return;
        } else {
            throw err;
        }
    }
})


/** File Watch websocket **/
var changesWs = expressWsInstance.getWss();
expressWsInstance.app.ws('/changes', function (ws, req) {
    console.log("Socket Connected")
})
chokidar.watch(watchdir, { ignoreInitial: true, cwd: watchdir }).on('all', (event, path) => {
    // console.log(event, path);
    changesWs.clients.forEach(function (client) {
        client.send(JSON.stringify({
            event: event,
            path: path,
        }));
    })
})


app.listen(port, () => { });







