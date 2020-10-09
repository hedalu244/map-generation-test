"use strict";
const width = 11;
function mergeSets(a, b, sets) {
    for (let i = 0; i < sets.length; i++)
        if (sets[i] == a)
            sets[i] = b;
}
function Field() {
    return {
        blocks: [
            new Array(width).fill(0).map((_, i) => "Block")
        ],
        pendingBlocks: [
            new Array(width).fill(0).map((_, i) => ["Air", "Block"])
        ],
        sets: new Array(width).fill(0).map((_, i) => i)
    };
}
function generate(field) {
    //自由にしていいブロックを勝手に決める
    let newLine = field.pendingBlocks.shift().map(x => (x[Math.floor(Math.random() * x.length)]));
    field.pendingBlocks.push(new Array(width).fill(0).map((_, i) => ["Air", "Block"]));
    // 上から移動して来れない箇所に新しいセットを作る
    let setCount = Math.max(...field.sets);
    for (let i = 0; i < width; i++) {
        if (newLine[i] != "Air" || field.blocks[field.blocks.length - 1][i] != "Air")
            field.sets[i] = ++setCount;
    }
    // 隣へ移動できるときは同じセットにマージ
    for (let i = 0; i < width - 1; i++) {
        if (newLine[i] == "Air" && newLine[i + 1] == "Air")
            mergeSets(field.sets[i], field.sets[i + 1], field.sets);
    }
    // それぞれのセットについて、少なくとも一箇所は下をairにする
    let pointList = [];
    for (let i = 0; i < width; i++) {
        if (newLine[i] == "Block")
            continue;
        if (pointList[field.sets[i]] === undefined)
            pointList[field.sets[i]] = [i];
        else
            pointList[field.sets[i]].push(i);
    }
    pointList.forEach(points => {
        let num = 1 + Math.floor(Math.random() * (points.length - 1));
        for (let i = 0; i < num; i++) {
            field.pendingBlocks[0][points[Math.floor(Math.random() * points.length)]] = ["Air"];
        }
    });
    field.blocks.push(newLine);
    show(field);
}
function show(field) {
    console.log("blocks:");
    field.blocks.forEach(line => console.log("[]" + line.map(x => x == "Block" ? "[]" : "  ").join("") + "[]"));
    console.log("sets:");
    console.log("" + field.sets);
}
