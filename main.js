"use strict";
const Collision = { Air: 1, Block: 2, Ladder: 4 };
const anyCollision = Collision.Air | Collision.Block | Collision.Ladder;
const width = 11;
function mergeSets(a, b, sets) {
    for (let i = 0; i < sets.length; i++)
        if (sets[i] == b)
            sets[i] = a;
}
function Field() {
    return {
        blocks: [
            new Array(width).fill(0).map(_ => Collision.Block),
            new Array(width).fill(0).map(_ => Collision.Air),
        ],
        pendingBlocks: [
            new Array(width).fill(0).map(_ => ~Collision.Block),
            new Array(width).fill(0).map(_ => anyCollision),
        ],
        graph: new Array(width).fill(0).map(_ => [])
    };
}
function canGoUp(field, x, y) {
    return canEnter(field, x, y) && canStand(field, x, y) && canStand(field, x, y + 1);
}
function canGoDown(field, x, y) {
    return field.blocks[y][x] !== Collision.Block && canEnter(field, x, y - 1);
}
function canGoLeft(field, x, y) {
    return canEnter(field, x, y) && canStand(field, x, y) && canEnter(field, x - 1, y);
}
function canGoRight(field, x, y) {
    return canEnter(field, x, y) && canStand(field, x, y) && canEnter(field, x + 1, y);
}
function canGoLeftUp(field, x, y) {
    return canEnter(field, x, y) && canStand(field, x, y) && field.blocks[y][x - 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x - 1, y + 1);
}
function canGoRightUp(field, x, y) {
    return canEnter(field, x, y) && canStand(field, x, y) && field.blocks[y][x + 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x + 1, y + 1);
}
function canEnter(field, x, y) {
    if (y == field.blocks.length - 1)
        return field.blocks[y][x] !== Collision.Block && (field.pendingBlocks[0][x] & Collision.Block) === 0;
    return field.blocks[y][x] !== Collision.Block && field.blocks[y + 1][x] !== Collision.Block;
}
function canStand(field, x, y) {
    return canEnter(field, x, y) && (field.blocks[y - 1][x] == Collision.Block || field.blocks[y][x] == Collision.Ladder);
}
function putCollisionPattern(pendingBlocks, pattern, offsetX) {
    const pendingBlocks2 = pendingBlocks.map((row, y) => row.map((a, x) => {
        return a & (pattern[y] !== undefined && pattern[y][x - offsetX] !== undefined ? pattern[y][x - offsetX] : anyCollision);
    }));
    if (pendingBlocks2.some(row => row.some(p => p == 0)))
        return null;
    return pendingBlocks2;
}
function generate(field) {
    //自由にしていいブロックを勝手に決める
    const newLine = field.pendingBlocks.shift().map(pending => {
        const candidate = (Object.values(Collision).filter(coll => pending & coll));
        return candidate[Math.floor(Math.random() * candidate.length)];
    });
    field.pendingBlocks.push(new Array(width).fill(0).map((_, i) => anyCollision));
    field.blocks.push(newLine);
    // 足場の上は高確率で高さ2のスペースを確保、など都合のいい設定
    for (let x = 0; x < width; x++) {
        // ブロックの上にブロックでないマスがあったらその上は高確率でブロックでない
        if (field.blocks[field.blocks.length - 2][x] === Collision.Block &&
            field.blocks[field.blocks.length - 1][x] !== Collision.Block &&
            Math.random() < 0.9)
            field.pendingBlocks[0][x] &= ~Collision.Block;
        // 梯子があったらその上は必ずブロックでない
        if (field.blocks[field.blocks.length - 1][x] === Collision.Ladder)
            field.pendingBlocks[0][x] &= ~Collision.Block;
        // 長さ1の梯子を生成しない
        if (field.blocks[field.blocks.length - 1][x] === Collision.Ladder &&
            field.blocks[field.blocks.length - 2][x] !== Collision.Ladder)
            field.pendingBlocks[0][x] &= Collision.Ladder;
    }
    // 生成されたblocksに合わせてgraphを更新
    // 後ろに下の段の頂点を追加しておく
    const newGraph = concatGraph(new Array(width).fill(0).map(_ => []), field.graph);
    // 上下移動を繋ぐ
    for (let i = 0; i < width; i++) {
        if (canGoUp(field, i, field.blocks.length - 2) || field.blocks[field.blocks.length - 1][i] == Collision.Air)
            newGraph[i + width].push(i);
        if (canGoDown(field, i, field.blocks.length - 1))
            newGraph[i].push(i + width);
    }
    // 左右、斜め移動を繋ぐ
    for (let i = 0; i < width - 1; i++) {
        if (canGoRight(field, i, field.blocks.length - 1))
            newGraph[i].push(i + 1);
        if (canGoLeft(field, i + 1, field.blocks.length - 1))
            newGraph[i + 1].push(i);
        //　前の行では未確定だった左右移動があるかもしれないので追加
        if (canGoRight(field, i, field.blocks.length - 2))
            newGraph[i + width].push(i + 1 + width);
        if (canGoLeft(field, i + 1, field.blocks.length - 2))
            newGraph[i + 1 + width].push(i + width);
        if (canGoRightUp(field, i, field.blocks.length - 2))
            newGraph[i + width].push(i + 1);
        if (canGoLeftUp(field, i + 1, field.blocks.length - 2))
            newGraph[i + 1 + width].push(i);
    }
    // 推移閉包を取った上で、後ろに入れておいた古い頂点を落とす
    field.graph = dropGraph(transclosure(newGraph), width);
    // 必須の入口出口の候補地を取得
    const [entranceList, exitList] = strengthen(field.graph);
    // 入り口出口のパターンを列挙（二次元配列の各行から一つずつ選べればOK）
    const patternList = [
        ...entranceList.map(points => {
            const list = [];
            points.forEach(x => {
                // 立ち入れない点は孤立点だが出口を作る必要はない
                if (!canEnter(field, x, field.blocks.length - 1))
                    return;
                //上2個がブロックでなければ入り口になる
                list.push({ pattern: [[~Collision.Block], [~Collision.Block]], offsetX: x });
            });
            return list;
        }),
        ...exitList.map(points => {
            const list = [];
            points.forEach(x => {
                // 立ち入れない点は孤立点だが出口を作る必要はない
                if (!canEnter(field, x, field.blocks.length - 1))
                    return;
                if (!canStand(field, x, field.blocks.length - 1))
                    return;
                //上に梯子を作れば出口になる
                list.push({ pattern: [[Collision.Ladder]], offsetX: x });
                //隣がブロックなら斜め上に立ち位置を作れば出口になる
                if (field.blocks[field.blocks.length - 1][x - 1] == Collision.Block)
                    list.push({ pattern: [[~Collision.Block, ~Collision.Block], [~Collision.Block, anyCollision]], offsetX: x - 1 });
                if (field.blocks[field.blocks.length - 1][x + 1] == Collision.Block)
                    list.push({ pattern: [[~Collision.Block, ~Collision.Block], [anyCollision, ~Collision.Block]], offsetX: x });
            });
            return list;
        }),
    ].filter(x => 0 < x.length).map(x => shuffle(x));
    function shuffle(array) {
        for (let i = 0; i < array.length; i++) {
            const j = i + Math.floor(Math.random() * (array.length - i));
            const t = array[i];
            array[i] = array[j];
            array[j] = t;
        }
        return array;
    }
    // 制約パターンから重複しないようにいい感じに選んで設置する
    function rec(pendingBlocks, patternList) {
        if (patternList.length === 0)
            return pendingBlocks;
        const head = patternList[0];
        const tail = patternList.slice(1);
        for (let i = 0; i < head.length; i++) {
            const pendingBlocks2 = putCollisionPattern(pendingBlocks, head[i].pattern, head[i].offsetX);
            if (pendingBlocks2 == null)
                return null;
            const result = rec(pendingBlocks2, tail);
            if (result !== null)
                return result;
        }
        return null;
    }
    const pendingBlocks2 = rec(field.pendingBlocks, patternList);
    if (pendingBlocks2 === null)
        throw new Error();
    field.pendingBlocks = pendingBlocks2;
    console.log(field.graph);
    const entranceIds = new Array(width).fill("  ");
    entranceList.forEach((a, i) => a.forEach(x => { if (canEnter(field, x, field.blocks.length - 1))
        entranceIds[x] = i < 10 ? " " + i : "" + i; }));
    console.log("entrance↓");
    console.log(entranceList);
    console.log(" " + entranceIds.join(""));
    const exitIds = new Array(width).fill("  ");
    exitList.forEach((a, i) => a.forEach(x => { if (canEnter(field, x, field.blocks.length - 1))
        exitIds[x] = i < 10 ? " " + i : "" + i; }));
    console.log("exit↑");
    console.log(exitList);
    console.log(" " + exitIds.join(""));
    show(field);
}
function show(field) {
    function collisionToString(coll) {
        switch (coll) {
            case Collision.Air: return "  ";
            case Collision.Block: return "[]";
            case Collision.Ladder: return "|=";
        }
    }
    console.log("blocks:");
    [...field.blocks].reverse().forEach(line => console.log(":" + line.map(collisionToString).join("") + ":"));
}
// 二つのグラフを合わせたグラフを作る
function concatGraph(a, b) {
    const newGraph = new Array(a.length + b.length).fill(0).map(_ => []);
    a.forEach((v, from) => v.forEach(to => newGraph[from].push(to)));
    b.forEach((v, from) => v.forEach(to => newGraph[from + a.length].push(to + a.length)));
    return newGraph;
}
// n 以降の頂点とそれにつながる辺を削除する
function dropGraph(graph, n) {
    return graph.slice(0, n).map(v => v.filter(to => to < n));
}
// 推移閉包を作成
function transclosure(graph) {
    const newGraph = new Array(graph.length).fill(0).map(_ => []);
    function dfs(now, root, visited) {
        if (visited[now])
            return;
        visited[now] = true;
        newGraph[root].push(now);
        graph[now].forEach(x => dfs(x, root, visited));
    }
    graph.forEach((v, i) => v.forEach(j => dfs(j, i, new Array(graph.length).fill(false))));
    return newGraph;
}
function reverse(graph) {
    const reversed = [];
    graph.forEach((vertex) => {
        reversed.push([]);
    });
    graph.forEach((vertex, i) => {
        vertex.forEach(j => reversed[j].push(i));
    });
    return reversed;
}
function strongComponents(graph) {
    const reversed = reverse(graph);
    const visited = new Array(graph.length).fill(0);
    const component = new Array(graph.length);
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
            graph[now].forEach(x => dfs1(x));
            log.unshift(now);
        }
        dfs1(i);
        function dfs2(now) {
            if (visited[now] !== 1)
                return;
            visited[now] = 2;
            component[now] = componentCount;
            reversed[now].forEach(x => dfs2(x));
        }
        for (var j = 0; j < log.length; j++) {
            if (visited[log[j]] !== 1)
                continue;
            dfs2(log[j]);
            componentCount++;
        }
    }
    return [component, componentCount];
}
// 強連結にするために追加すべき出口と入り口の候補地を教えてくれる
function strengthen(graph) {
    const [component, componentCount] = strongComponents(graph);
    //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
    const entranceCount = new Array(componentCount).fill(0);
    const exitCount = new Array(componentCount).fill(0);
    graph.forEach((v, from) => {
        v.forEach(to => {
            if (component[from] !== component[to]) {
                exitCount[component[from]]++;
                entranceCount[component[to]]++;
            }
        });
    });
    const entranceList = [];
    const exitList = [];
    //入り口のない強連結成分、出口のない成分のメンバーを成分ごとに分けてリストアップする
    for (let i = 0; i < componentCount; i++) {
        if (exitCount[i] !== 0 && entranceCount[i] !== 0)
            continue;
        const members = [];
        for (let j = 0; j < graph.length; j++)
            if (component[j] === i)
                members.push(j);
        if (exitCount[i] === 0)
            exitList.push([...members]);
        if (entranceCount[i] === 0)
            entranceList.push([...members]);
    }
    return [entranceList, exitList];
}
