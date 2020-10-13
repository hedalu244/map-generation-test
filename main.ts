// 配列をシャッフルした配列を返す
function shuffle<T>(array: T[]): T[] {
    const array2 = [...array];
    for (let i = 0; i < array2.length; i++) {
        const j = i + Math.floor(Math.random() * (array2.length - i));

        const t = array2[i];
        array2[i] = array2[j];
        array2[j] = t;
    }
    return array2;
}

type Vertex = number[];
type Graph = Vertex[];

// 二つのグラフを合わせたグラフを作る
function concatGraph(a: Graph, b: Graph) {
    const newGraph: Graph = new Array(a.length + b.length).fill(0).map(_ => []);
    a.forEach((v, from) => v.forEach(to => newGraph[from].push(to)));
    b.forEach((v, from) => v.forEach(to => newGraph[from + a.length].push(to + a.length)));
    return newGraph;
}

// n 以降の頂点とそれにつながる辺を削除する
function dropGraph(graph: Graph, n: number) {
    return graph.slice(0, n).map(v => v.filter(to => to < n));
}

// 推移閉包を作成
function transclosure(graph: Graph) {
    const newGraph: Graph = new Array(graph.length).fill(0).map(_ => []);
    function dfs(now: number, root: number, visited: boolean[]) {
        if (visited[now]) return;
        visited[now] = true;
        newGraph[root].push(now);
        graph[now].forEach(x => dfs(x, root, visited));
    }
    graph.forEach((v, i) => v.forEach(j => dfs(j, i, new Array(graph.length).fill(false))));
    return newGraph.map(x => Array.from(new Set(x)));
}

// 辺の向きをすべて逆転したグラフを得る
function reverse(graph: Vertex[]) {
    const reversed: Vertex[] = [];
    graph.forEach((vertex) => {
        reversed.push([]);
    });
    graph.forEach((vertex, i) => {
        vertex.forEach(j => reversed[j].push(i));
    });

    return reversed;
}

// 強連結成分分解
function strongComponents(graph: Vertex[]): [number[], number] {
    const reversed = reverse(graph);
    // dfs1で到達したら1、dfs2も到達したら2、いずれも未到達なら0
    const visited: (0 | 1 | 2)[] = new Array(graph.length).fill(0);
    // component[i] = i番目の頂点が属する強連結成分の番号
    const component: number[] = new Array(graph.length);
    let componentCount = 0;

    // 連結でないグラフに対応するためにはたぶんここをループする必要がある
    for (var i = 0; i < graph.length; i++) {
        if (visited[i] !== 0) continue;
        // 深さ優先探索 i<j⇒log[i] log[j]間に辺がある
        const order: number[] = [];
        function dfs1(now: number) {
            if (visited[now] !== 0) return;
            visited[now] = 1;
            graph[now].forEach(x => dfs1(x));
            order.unshift(now);
        }
        dfs1(i);

        function dfs2(now: number) {
            if (visited[now] !== 1) return;
            visited[now] = 2;
            component[now] = componentCount;
            reversed[now].forEach(x => dfs2(x));
        }
        for (var j = 0; j < order.length; j++) {
            if (visited[order[j]] !== 1) continue;
            dfs2(order[j]);
            componentCount++;
        }
    }
    return [component, componentCount];
}

const Collision = { Air: 1 as const, Block: 2 as const, Ladder: 4 as const };

const anyCollision = Collision.Air | Collision.Block | Collision.Ladder;

type Collision = typeof Collision[keyof typeof Collision];

type Block = Collision;

type PendingBlock = number;

interface Field {
    pendingBlocks: PendingBlock[][];
    blocks: Block[][];
    graph: Graph;
}

const width = 11;

function Field(): Field {
    const x = Math.floor(Math.random() * width);
    return {
        blocks: [
            new Array(width).fill(0).map(_ => Collision.Block),
            new Array(width).fill(0).map(_ => Collision.Air),
        ],
        pendingBlocks: [
            new Array(width).fill(0).map((_, i) => i == x ? Collision.Ladder : ~Collision.Block),
            new Array(width).fill(0).map(_ => anyCollision),
        ],
        graph: new Array(width).fill(0).map(_ => [])
    };
}

function show(field: Field) {
    function collisionToString(coll: Collision) {
        switch (coll) {
            case Collision.Air: return "  ";
            case Collision.Block: return "[]";
            case Collision.Ladder: return "|=";
        }
    }
    console.log("blocks:");
    [...field.blocks].reverse().forEach(line => console.log(":" + line.map(collisionToString).join("") + ":"));
}

function canEnter(field: Field, x: number, y: number): boolean {
    // 上半身が未確定に突っ込んでいるときは、封じられる可能性がないときにtrue
    if (y == field.blocks.length - 1)
        return field.blocks[y][x] !== Collision.Block && (field.pendingBlocks[0][x] & Collision.Block) === 0;
    return field.blocks[y][x] !== Collision.Block && field.blocks[y + 1][x] !== Collision.Block;
}
function canStand(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && (field.blocks[y - 1][x] == Collision.Block || field.blocks[y][x] == Collision.Ladder);
}
function canGoUp(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canStand(field, x, y) && canStand(field, x, y + 1);
}
function canGoDown(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canEnter(field, x, y - 1);
}
function canGoLeft(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canStand(field, x, y) && canEnter(field, x - 1, y);
}
function canGoRight(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canStand(field, x, y) && canEnter(field, x + 1, y);
}
function canGoLeftUp(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canStand(field, x, y) && field.blocks[y][x - 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x - 1, y + 1);
}
function canGoRightUp(field: Field, x: number, y: number): boolean {
    return canEnter(field, x, y) && canStand(field, x, y) && field.blocks[y][x + 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x + 1, y + 1);
}

function putCollisionPattern(pendingBlocks: PendingBlock[][], pattern: PendingBlock[][], offsetX: number): PendingBlock[][] | null {
    const pendingBlocks2 = pendingBlocks.map((row, y) => row.map((a, x) => {
        return a & (pattern[y] !== undefined && pattern[y][x - offsetX] !== undefined ? pattern[y][x - offsetX] : anyCollision);
    }));
    if (pendingBlocks2.some(row => row.some(p => p == 0))) return null;

    return pendingBlocks2;
}

function generate(field: Field) {
    const newRow: Collision[] = new Array(width);

    // とりあえず確定してるところを置く
    field.pendingBlocks[0].forEach((pending, x) => {
        if (pending == Collision.Air) newRow[x] = Collision.Air;
        if (pending == Collision.Block) newRow[x] = Collision.Block;
        if (pending == Collision.Ladder) newRow[x] = Collision.Ladder;
    });

    // 自由にしていいブロックを勝手に決める。
    // 左右の対称性を保つために決定順をシャッフルする。
    shuffle(new Array(width).fill(0).map((_, i) => i)).forEach(x => {
        const pending = field.pendingBlocks[0][x];
        if (pending == Collision.Air ||
            pending == Collision.Block ||
            pending == Collision.Ladder) return;
        const candidate: Collision[] = [];

        if ((pending & Collision.Air) !== 0) {
            // 梯子を相対的に少なくしたい
            candidate.push(Collision.Air, Collision.Air, Collision.Air);
        }
        if ((pending & Collision.Block) !== 0) {
            // 梯子を相対的に少なくしたい
            candidate.push(Collision.Block, Collision.Block);
            // ブロックの左右隣接を好む
            if (newRow[x - 1] === Collision.Block || newRow[x + 1] === Collision.Block) candidate.push(Collision.Block, Collision.Block);
        }
        // 梯子、特に左右隣り合わせを嫌う
        if ((pending & Collision.Ladder) !== 0) {
            if (newRow[x - 1] !== Collision.Ladder && newRow[x + 1] !== Collision.Ladder)
                candidate.push(Collision.Ladder);
        }

        newRow[x] = candidate[Math.floor(Math.random() * candidate.length)];
    });

    // 新しい行を追加
    field.blocks.push(newRow);
    field.pendingBlocks.shift();
    if (field.pendingBlocks.length < 2)
        field.pendingBlocks.push(new Array(width).fill(0).map((_, i) => anyCollision));

    // ここからは追加した行に合わせて graphを更新したりpendingBlocksに条件を追加したり
    
    // 足場の上は高確率で高さ2のスペースを確保、など、列ごとに独立でヒューリスティックな設定
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
    const newGraph: Graph = concatGraph(new Array(width).fill(0).map(_ => []), field.graph);
    // 上下移動を繋ぐ
    for (let i = 0; i < width; i++) {
        if (canGoUp(field, i, field.blocks.length - 2)) newGraph[i + width].push(i);
        if (canGoDown(field, i, field.blocks.length - 1)) newGraph[i].push(i + width);
    }
    // 左右、斜め移動を繋ぐ
    for (let i = 0; i < width - 1; i++) {
        if (canGoRight(field, i, field.blocks.length - 1)) newGraph[i].push(i + 1);
        if (canGoLeft(field, i + 1, field.blocks.length - 1)) newGraph[i + 1].push(i);

        //　前の行では未確定だった左右移動があるかもしれないので追加
        if (canGoRight(field, i, field.blocks.length - 2)) newGraph[i + width].push(i + 1 + width);
        if (canGoLeft(field, i + 1, field.blocks.length - 2)) newGraph[i + 1 + width].push(i + width);

        if (canGoRightUp(field, i, field.blocks.length - 2)) newGraph[i + width].push(i + 1);
        if (canGoLeftUp(field, i + 1, field.blocks.length - 2)) newGraph[i + 1 + width].push(i);
    }

    // 推移閉包を取った上で、後ろに入れておいた古い頂点を落とす
    field.graph = dropGraph(transclosure(newGraph), width);

    // 強連結成分分解
    const [component, componentCount] = strongComponents(field.graph);

    //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
    const entranceCount: number[] = new Array(componentCount).fill(0);
    const exitCount: number[] = new Array(componentCount).fill(0);
    field.graph.forEach((v, from) => {
        v.forEach(to => {
            if (component[from] !== component[to]) {
                exitCount[component[from]]++;
                entranceCount[component[to]]++;
            }
        });
    });

    const componentsWithoutEntrance: number[][] = [];
    const componentsWithoutExit: number[][] = [];
    //入り口のない強連結成分、出口のない成分のメンバーを成分ごとに分けてリストアップする
    for (let i = 0; i < componentCount; i++) {
        if (exitCount[i] !== 0 && entranceCount[i] !== 0) continue;

        const members = [];
        for (let j = 0; j < field.graph.length; j++)
            if (component[j] === i) members.push(j);

        if (exitCount[i] === 0)
            componentsWithoutExit.push([...members]);
        if (entranceCount[i] === 0)
            componentsWithoutEntrance.push([...members]);
    }

    // 制約パターンの組み合わせを列挙（二次元配列の各行から一つずつ選べればOK）
    const patternList = [
        ...componentsWithoutEntrance.map(points => {
            const list: { pattern: number[][], offsetX: number; }[] = [];
            points.forEach(x => {
                // 立ち入れない点は孤立点だが出口を作る必要はない
                if (!canEnter(field, x, field.blocks.length - 1)) return;
                //上2個がブロックでなければ入り口になる
                list.push({ pattern: [[~Collision.Block], [~Collision.Block]], offsetX: x });
            });
            return list;
        }),
        ...componentsWithoutExit.map(points => {
            const list: { pattern: number[][], offsetX: number; }[] = [];
            points.forEach(x => {
                // 立ち入れない点は孤立点だが出口を作る必要はない
                if (!canEnter(field, x, field.blocks.length - 1)) return;
                // 立てない点に出口を作っても手遅れ
                if (!canStand(field, x, field.blocks.length - 1)) return;

                //上に梯子を作れば出口になる
                list.push({ pattern: [[Collision.Ladder]], offsetX: x });

                //隣がブロックなら斜め上に立ち位置を作れば出口になる
                if (field.blocks[field.blocks.length - 1][x - 1] == Collision.Block)
                    list.push({ pattern: [[~Collision.Block, ~Collision.Block], [~Collision.Block, ~Collision.Block]], offsetX: x - 1 });
                if (field.blocks[field.blocks.length - 1][x + 1] == Collision.Block)
                    list.push({ pattern: [[~Collision.Block, ~Collision.Block], [~Collision.Block, ~Collision.Block, ~Collision.Block]], offsetX: x });
            });
            return list;
        }),
    ].filter(x => 0 < x.length).map(x => shuffle(x));

    // 制約パターンが矛盾しないような組み合わせを探して設置する（多分どう選んでも矛盾しないけど）
    function rec(pendingBlocks: PendingBlock[][], patternList: { pattern: number[][], offsetX: number; }[][]): PendingBlock[][] | null {
        if (patternList.length === 0) return pendingBlocks;
        const head = patternList[0];
        const tail = patternList.slice(1);

        for (let i = 0; i < head.length; i++) {
            const pendingBlocks2 = putCollisionPattern(pendingBlocks, head[i].pattern, head[i].offsetX);
            if (pendingBlocks2 == null) return null;
            const result = rec(pendingBlocks2, tail);
            if (result !== null) return result;
        }

        return null;
    }

    const pendingBlocks2 = rec(field.pendingBlocks, patternList);
    if (pendingBlocks2 === null) throw new Error();
    field.pendingBlocks = pendingBlocks2;

    
    // 以下デバッグ表示

    console.log(field.graph);

    const entranceId1 = new Array(width).fill("  ");
    const entranceId2 = new Array(width).fill("  ");
    componentsWithoutEntrance.forEach((a, i) => a.forEach(x => { entranceId2[x] = i < 10 ? " " + i : "" + i; if (canEnter(field, x, field.blocks.length - 1)) entranceId1[x] = i < 10 ? " " + i : "" + i; }));
    console.log("entrance↓");
    //console.log(entranceList);
    console.log(" " + entranceId1.join(""));
    console.log("(" + entranceId2.join("") + ")");

    const exitId1 = new Array(width).fill("  ");
    const exitId2 = new Array(width).fill("  ");
    componentsWithoutExit.forEach((a, i) => a.forEach(x => { exitId2[x] = i < 10 ? " " + i : "" + i; if (canEnter(field, x, field.blocks.length - 1)) exitId1[x] = i < 10 ? " " + i : "" + i; }));
    console.log("exit↑");
    //console.log(exitList);
    console.log(" " + exitId1.join(""));
    console.log("(" + exitId2.join("") + ")");

    show(field);

    if (exitId1.join("").trim() == "" || entranceId1.join("").trim() == "") throw new Error("no Exit or Entrance");
}