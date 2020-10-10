const Collision = { Air: 1 as const, Block: 2 as const, Ladder: 4 as const };

const anyCollision = Collision.Air | Collision.Block | Collision.Ladder;

type Collision = typeof Collision[keyof typeof Collision];

type Block = Collision;

type PendingBlock = number;

interface Field {
    pendingBlocks: PendingBlock[][];
    blocks: Block[][];
    sets: number[];
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
            new Array(width).fill(0).map(_ => Collision.Block)
        ],
        pendingBlocks: [
            new Array(width).fill(0).map(_ => anyCollision)
        ],
        sets: new Array(width).fill(0).map((_, i) => 0)
    };
}

function canGoUp(field:Field, x:number, y:number): boolean {
    return field.blocks[y][x] == Collision.Ladder && field.blocks[y + 1][x] == Collision.Ladder;
}
function canGoDown(field:Field, x:number, y:number): boolean {
    return field.blocks[y - 1][x] != Collision.Block;
}
function canGoLeft(field:Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block && field.blocks[y][x] == Collision.Ladder) && field.blocks[y][x - 1] != Collision.Block;
}
function canGoRight(field:Field, x: number, y: number): boolean {
    return (field.blocks[y - 1][x] == Collision.Block && field.blocks[y][x] == Collision.Ladder) && field.blocks[y][x + 1] != Collision.Block;
}
function canEnter(field: Field, x: number, y:number): boolean {
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

    // 生成されたblocksに合わせてsetsを更新
    // 下から移動して来れない箇所に新しいセットを作る
    let setCount = Math.max(...field.sets);
    let newSets = [];
    for (let i = 0; i < width; i++) {
        if (!canEnter(field, i, field.blocks.length - 1)) { newSets[i] = 0; continue; }
        if (canGoUp(field, i, field.blocks.length - 2)) newSets[i] = field.sets[i];
        else newSets[i] = ++setCount;
    }
    // 隣へ移動できるときは同じセットにマージ
    for (let i = 0; i < width - 1; i++) {
        if (canGoRight(field, i, field.blocks.length - 1))
            mergeSets(newSets[i], newSets[i + 1], newSets);
    }

    field.sets = newSets;

    // それぞれのセットについて、一箇所は上がairであることを保証する
    let pointList: number[][] = [];
    for (let i = 0; i < width; i++) {
        if (!canEnter(field, i, field.blocks.length - 1)) continue;
        if (pointList[newSets[i]] === undefined)
            pointList[newSets[i]] = [i];
        else pointList[newSets[i]].push(i);
    }
    pointList.forEach(points => {
        const point = points[Math.floor(Math.random() * points.length)];
        field.pendingBlocks[0][point] &= ~Collision.Block;
    });


    show(field);
}

function show(field: Field) {
    function collisionToString(coll: Collision) {
        switch(coll) {
            case Collision.Air: return "  ";
            case Collision.Block: return "[]";
            case Collision.Ladder: return "|=";
        }
    }
    console.log("blocks:");
    [...field.blocks].reverse().forEach(line => console.log("[]" + line.map(collisionToString).join("") + "[]"));

    console.log("sets:");
    console.log("" + field.sets);
}


type Vertex = number[];
type Graph = Vertex[];

function randomGraph(n: number, rate = 0.3): Vertex[] {
    const cx = 256, cy = 256, r = 200;
    let graph: Vertex[] = [];
    for (let i = 0; i < n; i++)
        graph.push([]);

    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            if (Math.random() < rate) graph[i].push(j);


    return graph;
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

// グラフに頂点を追加して強連結にする
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

    const toList = [];
    const fromList = [];
    //入り口のない強連結成分、出口のない成分のメンバーを成分ごとに分けてリストアップする
    for (let i = 0; i < componentCount; i++) {
        if (exitCount[i] !== 0 && entranceCount[i] !== 0) continue;

        const members = [];
        for (let j = 0; j < graph.length; j++)
            if (component[j] === i) members.push(j);

        if (exitCount[i] === 0)
            fromList.push([...members]);
        if (entranceCount[i] === 0)
            toList.push([...members]);
    }

    fromList.forEach(x => graph[x[Math.floor(Math.random() * x.length)]].push(graph.length));
    graph.push([]);
    toList.forEach(x => graph[graph.length - 1].push(x[Math.floor(Math.random() * x.length)]));
}