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

function mergeSets(a: number, b: number, sets: number[]) {
    for (let i = 0; i < sets.length; i++)
        if (sets[i] == b)
            sets[i] = a;
}

function Field(): Field {
    return {
        blocks: [
            new Array(width).fill(0).map(_ => Collision.Block),
            new Array(width).fill(0).map(_ => Collision.Block)
        ],
        pendingBlocks: [
            new Array(width).fill(0).map(_ => anyCollision)
        ],
        graph: new Array(width).fill(0).map(_ => [])
    };
}


function canGoUp(field: Field, x: number, y: number): boolean {
    return field.blocks[y + 1][x] == Collision.Ladder;
}
function canGoDown(field: Field, x: number, y: number): boolean {
    return field.blocks[y - 1][x] != Collision.Block;
}
function canGoLeft(field: Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block || field.blocks[y][x] == Collision.Ladder) && canEnter(field, x - 1, y);
}
function canGoRight(field: Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block || field.blocks[y][x] == Collision.Ladder) && canEnter(field, x + 1, y);
}
function canGoLeftUp(field: Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block && field.blocks[y][x] == Collision.Ladder) && field.blocks[y][x - 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x - 1, y + 1);
}
function canGoRightUp(field: Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block && field.blocks[y][x] == Collision.Ladder) && field.blocks[y][x + 1] == Collision.Block && canEnter(field, x, y + 1) && canEnter(field, x + 1, y + 1);
}
function canEnter(field: Field, x: number, y: number): boolean {
    return field.blocks[y][x] != Collision.Block;
}

function generate(field: Field) {
    //自由にしていいブロックを勝手に決める
    let newLine = field.pendingBlocks.shift().map(pending => {
        if (pending === 0) throw new Error();
        let candidate = (Object.values(Collision).filter(coll => pending & coll));
        return candidate[Math.floor(Math.random() * candidate.length)];
    });
    field.pendingBlocks.push(
        new Array(width).fill(0).map((_, i) => anyCollision));
    field.blocks.push(newLine);

    // 生成されたblocksに合わせてgraphを更新
    // 後ろに下の段の頂点を追加しておく
    let newGraph: Graph = concatGraph(new Array(width).fill(0).map(_ => []), field.graph);
    // 上下移動を繋ぐ
    for (let i = 0; i < width; i++) {
        if (!canEnter(field, i, field.blocks.length - 1)) continue;
        if (canGoUp(field, i, field.blocks.length - 2)) newGraph[i + width].push(i);
        if (canGoDown(field, i, field.blocks.length - 1)) newGraph[i].push(i + width);
    }
    // 左右、斜め移動を繋ぐ
    for (let i = 0; i < width - 1; i++) {
        if (!canEnter(field, i, field.blocks.length - 1)) continue;
        if (canGoRight(field, i, field.blocks.length - 1)) newGraph[i].push(i + 1);
        if (canGoLeft(field, i + 1, field.blocks.length - 1)) newGraph[i + 1].push(i);
        if (canGoRightUp(field, i, field.blocks.length - 2)) newGraph[i + width].push(i + 1);
        if (canGoLeftUp(field, i + 1, field.blocks.length - 2)) newGraph[i + 1 + width].push(i);
    }

    // 推移閉包を取った上で、後ろに入れておいた古い頂点を落とす
    field.graph = dropGraph(transclosure(newGraph), width);

    // 必須の入口出口の候補地を取得
    let [entranceList, exitList] = strengthen(field.graph);
    // 入口と出口をいい感じに配置する。失敗したら一手戻ってやり直し
    entranceList.forEach(points => {
        const point = points[Math.floor(Math.random() * points.length)];

        //上がブロックでなければ入り口になる
        field.pendingBlocks[0][point] &= ~Collision.Block;
    });
    exitList.forEach(points => {
        const point = points[Math.floor(Math.random() * points.length)];
        //上に梯子を作れば出口になる
        if (field.blocks[field.blocks.length - 1][point] == Collision.Ladder)
            field.pendingBlocks[0][point] &= Collision.Ladder;
        //斜め上に足場を作れば出口になる
        else if (1 < point) field.pendingBlocks[0][point - 1] &= ~Collision.Block;
        else field.pendingBlocks[0][point + 1] &= ~Collision.Block;
    });


    show(field);
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
    [...field.blocks].reverse().forEach(line => console.log("[]" + line.map(collisionToString).join("") + "[]"));
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
    let visited: boolean[];
    const newGraph: Graph = new Array(graph.length).fill(0).map(_ => []);
    function dfs(now: number, root: number) {
        if (visited[now]) return;
        visited[now] = true;
        newGraph[root].push(now);
        graph[now].forEach(x => dfs(x, root));
    }
    graph.forEach((v, i) => { visited = new Array(graph.length).fill(false); v.forEach(j => dfs(j, i)); });
    return newGraph;
}

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

function strongComponents(graph: Vertex[]) {
    const reversed = reverse(graph);
    const visited = new Array(graph.length).fill(0);
    const component: number[] = new Array(graph.length);
    let componentCount = 0;

    //強連結成分分解
    for (var i = 0; i < graph.length; i++) {
        if (visited[i] !== 0) continue;
        const log: number[] = [];
        function dfs1(now: number) {
            if (visited[now] !== 0) return;
            visited[now] = 1;
            graph[now].forEach(x => dfs1(x));
            log.unshift(now);
        }
        dfs1(i);

        function dfs2(now: number) {
            if (visited[now] !== 1) return;
            visited[now] = 2;
            component[now] = componentCount;
            reversed[now].forEach(x => dfs2(x));
        }
        for (var j = 0; j < log.length; j++) {
            if (visited[log[j]] !== 1) continue;
            dfs2(log[j]);
            componentCount++;
        }
    }
    return [component, componentCount] as const;
}

// 強連結にするために追加すべき出口と入り口の候補地を教えてくれる
function strengthen(graph: Vertex[]) {
    const [component, componentCount] = strongComponents(graph);

    //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
    const entranceCount: number[] = new Array(componentCount).fill(0);
    const exitCount: number[] = new Array(componentCount).fill(0);
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
        if (exitCount[i] !== 0 && entranceCount[i] !== 0) continue;

        const members = [];
        for (let j = 0; j < graph.length; j++)
            if (component[j] === i) members.push(j);

        if (exitCount[i] === 0)
            exitList.push([...members]);
        if (entranceCount[i] === 0)
            entranceList.push([...members]);
    }

    return [entranceList, exitList];
}