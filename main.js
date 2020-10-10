"use strict";
function draw(graph) {
    const canvas = document.getElementById("canvas");
    if (!(canvas instanceof HTMLCanvasElement))
        throw new Error();
    const context = canvas.getContext("2d");
    if (context === null)
        throw new Error();
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    graph.forEach(vertex => {
        context.fillRect(vertex.pos.x, vertex.pos.y, 3, 3);
        vertex.next.forEach(i => {
            const next = graph[i];
            const length = Math.sqrt((next.pos.x - vertex.pos.x) * (next.pos.x - vertex.pos.x) +
                (next.pos.y - vertex.pos.y) * (next.pos.y - vertex.pos.y));
            const dirx = (next.pos.x - vertex.pos.x) / length;
            const diry = (next.pos.y - vertex.pos.y) / length;
            context.beginPath();
            context.moveTo(vertex.pos.x + 0.05 * (next.pos.x - vertex.pos.x), vertex.pos.y + 0.05 * (next.pos.y - vertex.pos.y));
            context.lineTo(vertex.pos.x + 0.95 * (next.pos.x - vertex.pos.x), vertex.pos.y + 0.95 * (next.pos.y - vertex.pos.y));
            context.stroke();
            context.beginPath();
            context.moveTo(vertex.pos.x + 0.95 * (next.pos.x - vertex.pos.x), vertex.pos.y + 0.95 * (next.pos.y - vertex.pos.y));
            context.lineTo(vertex.pos.x + 0.95 * (next.pos.x - vertex.pos.x) + (-0.87 * dirx + 0.5 * diry) * 10, vertex.pos.y + 0.95 * (next.pos.y - vertex.pos.y) + (-0.5 * dirx - 0.87 * diry) * 10);
            context.lineTo(vertex.pos.x + 0.95 * (next.pos.x - vertex.pos.x) + (-0.87 * dirx - 0.5 * diry) * 10, vertex.pos.y + 0.95 * (next.pos.y - vertex.pos.y) + (0.5 * dirx - 0.87 * diry) * 10);
            context.closePath();
            context.fill();
        });
    });
}
function randomGraph(n, rate = 0.3) {
    const cx = 256, cy = 256, r = 200;
    let graph = [];
    for (let i = 0; i < n; i++)
        graph.push({ pos: { x: cx + r * Math.cos(2 * i * Math.PI / n), y: cy + r * Math.sin(2 * i * Math.PI / n) }, next: [] });
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            if (Math.random() < rate)
                graph[i].next.push(j);
    return graph;
}
function reverse(graph) {
    const reversed = [];
    graph.forEach((vertex) => {
        reversed.push(Object.assign(Object.assign({}, vertex), { next: [] }));
    });
    graph.forEach((vertex, i) => {
        vertex.next.forEach(j => reversed[j].next.push(i));
    });
    return reversed;
}
function strongComponents(graph) {
    // 辺の向きが逆転したグラフ
    const reversed = reverse(graph);
    // 到達した履歴（未到達:0, 正順で到達:1, 逆順でも到達:2）
    const visited = new Array(graph.length).fill(0);
    // それぞれの頂点がどの強連結成分に属すか
    const component = new Array(graph.length);
    //強連結成分のカウント
    let componentCount = 0;
    //強連結成分分解
    for (var i = 0; i < graph.length; i++) {
        if (visited[i] !== 0)
            continue;
        const log = [];
        function dfs1(now) {
            if (visited[now] !== 0)
                return;
            visited[now] = 1;
            graph[now].next.forEach(x => dfs1(x));
            log.unshift(now);
        }
        dfs1(i);
        function dfs2(now) {
            if (visited[now] !== 1)
                return;
            visited[now] = 2;
            component[now] = componentCount;
            reversed[now].next.forEach(x => dfs2(x));
        }
        for (var j = 0; j < log.length; j++) {
            if (visited[log[j]] !== 1)
                continue;
            dfs2(log[j]);
            componentCount++;
        }
    }
    return component;
}
// グラフに頂点を追加して強連結にする
function strengthen(graph) {
    const component = strongComponents(graph);
    const componentCount = Math.max(...component) + 1;
    //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
    const entranceCount = new Array(componentCount).fill(0);
    const exitCount = new Array(componentCount).fill(0);
    graph.forEach((v, from) => {
        v.next.forEach(to => {
            if (component[from] !== component[to]) {
                exitCount[component[from]]++;
                entranceCount[component[to]]++;
            }
        });
    });
    const toList = [];
    const fromList = [];
    //入り口のない強連結成分のどこかへ行けるようにする
    for (let i = 0; i < componentCount; i++) {
        if (exitCount[i] === 0) {
            const members = [];
            for (let j = 0; j < graph.length; j++)
                if (component[j] === i)
                    members.push(j);
            fromList.push(members);
        }
        if (entranceCount[i] === 0) {
            const members = [];
            for (let j = 0; j < graph.length; j++)
                if (component[j] === i)
                    members.push(j);
            toList.push(members);
        }
    }
    fromList.forEach(x => graph[x[Math.floor(Math.random() * x.length)]].next.push(graph.length));
    graph.push({ next: [], pos: { x: 256, y: 256 } });
    toList.forEach(x => graph[graph.length - 1].next.push(x[Math.floor(Math.random() * x.length)]));
}
