"use strict";
const Collision = { Air: 1, Block: 2, };
const anyCollision = Collision.Air | Collision.Block /*| Collision.Ladder*/;
const width = 11;
function mergeSets(a, b, sets) {
    for (let i = 0; i < sets.length; i++)
        if (sets[i] == a)
            sets[i] = b;
}
function Field() {
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
function generate(field) {
    //自由にしていいブロックを勝手に決める
    let newLine = field.pendingBlocks.shift().map(pending => {
        if (pending === 0)
            throw new Error();
        let candidate = (Object.values(Collision).filter(coll => pending & coll));
        return candidate[Math.floor(Math.random() * candidate.length)];
    });
    field.pendingBlocks.push(new Array(width).fill(0).map((_, i) => anyCollision));
    // 上から移動して来れない箇所に新しいセットを作る
    let setCount = Math.max(...field.sets);
    for (let i = 0; i < width; i++) {
        if (newLine[i] == Collision.Block) {
            field.sets[i] = 0;
            continue;
        }
        if (newLine[i] != Collision.Air || field.blocks[field.blocks.length - 1][i] != Collision.Air)
            field.sets[i] = ++setCount;
    }
    // 隣へ移動できるときは同じセットにマージ
    for (let i = 0; i < width - 1; i++) {
        if (newLine[i] == Collision.Air && newLine[i + 1] == Collision.Air)
            mergeSets(field.sets[i], field.sets[i + 1], field.sets);
    }
    // それぞれのセットについて、一箇所は下がairであることを保証する
    let pointList = [];
    for (let i = 0; i < width; i++) {
        if (newLine[i] == Collision.Block)
            continue;
        if (pointList[field.sets[i]] === undefined)
            pointList[field.sets[i]] = [i];
        else
            pointList[field.sets[i]].push(i);
    }
    pointList.forEach(points => {
        const point = points[Math.floor(Math.random() * points.length)];
        field.pendingBlocks[0][point] &= Collision.Air;
    });
    field.blocks.push(newLine);
    show(field);
}
function show(field) {
    console.log("blocks:");
    [...field.blocks].reverse().forEach(line => console.log("[]" + line.map(x => x == Collision.Block ? "[]" : "  ").join("") + "[]"));
    console.log("sets:");
    console.log("" + field.sets);
}
