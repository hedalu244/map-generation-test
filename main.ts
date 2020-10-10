const Collision = { Air: 1 as const, Block: 2 as const, /*Ladder: 4 as const*/ };

const anyCollision = Collision.Air | Collision.Block /*| Collision.Ladder*/;

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
        if (sets[i] == a)
            sets[i] = b;
}

function Field(): Field {
    return {
        blocks: [
            new Array(width).fill(0).map((_, i) => Collision.Block)
        ],
        pendingBlocks: [
            new Array(width).fill(0).map((_, i) => anyCollision)
        ],
        sets: new Array(width).fill(0)
    };
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

    // 上から移動して来れない箇所に新しいセットを作る
    let setCount = Math.max(...field.sets);
    for (let i = 0; i < width; i++) {
        if (newLine[i] == Collision.Block) { field.sets[i] = 0; continue; }
        if (newLine[i] != Collision.Air || field.blocks[field.blocks.length - 1][i] != Collision.Air)
            field.sets[i] = ++setCount;
    }

    // 隣へ移動できるときは同じセットにマージ
    for (let i = 0; i < width - 1; i++) {
        if (newLine[i] == Collision.Air && newLine[i + 1] == Collision.Air)
            mergeSets(field.sets[i], field.sets[i + 1], field.sets);
    }

    // それぞれのセットについて、一箇所は下がairであることを保証する
    let pointList: number[][] = [];
    for (let i = 0; i < width; i++) {
        if (newLine[i] == Collision.Block) continue;
        if (pointList[field.sets[i]] === undefined)
            pointList[field.sets[i]] = [i];
        else pointList[field.sets[i]].push(i);
    }

    pointList.forEach(points => {
        const point = points[Math.floor(Math.random() * points.length)];
        field.pendingBlocks[0][point] &= Collision.Air;
    });

    field.blocks.push(newLine);

    show(field);
}

function show(field: Field) {
    console.log("blocks:");
    [...field.blocks].reverse().forEach(line => console.log("[]" + line.map(x => x == Collision.Block ? "[]" : "  ").join("") + "[]"));

    console.log("sets:");
    console.log("" + field.sets);
}


type Vertex = number[];

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