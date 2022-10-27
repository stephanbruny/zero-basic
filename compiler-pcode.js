const crypto = require('crypto');
/**
 * Simple Stack Based PCode compiler
 * @param {Token} token 
 * @param {string[]} opcodes 
 * @returns list of opcodes
 */
function compileAst(token = {}, memory = [], code = []) {
    const compile = (token, memory) => compileAst(token, memory, code);
    
    const putOp = (op, value, blob = {}) => ({ op, value, blob });

    const put = (op, value, blob) => {
        const result = putOp(op, value, blob);
        code.push(result);
        return result;
    }

    const compileLeftRight = (tok, post) => {
        const [left, right] = tok;
        const l = compile(left, memory);
        l.push(put('push'));
        const r = compile(right, memory);
        r.push(put('push'));
        return l.concat(r).concat(put(post));
    }

    if (token.not) {
        const right = compile(token.not);
        return right.concat([
            put('push'), 
            put('not')
        ])
    }

    if (token.add) {
        return compileLeftRight(token.add, 'add');
    }

    if (token.sub) {
        return compileLeftRight(token.sub, 'sub');
    }

    if (token.multiply) {
        return compileLeftRight(token.multiply, 'mul');
    }

    if (token.divide) {
        return compileLeftRight(token.divide, 'div');
    }

    if (token.equals) {
        return compileLeftRight([token.equals.left[0], token.equals.right[0]], 'eq');
    }

    if (token.greaterThan) {
        return compileLeftRight([token.greaterThan.left[0], token.greaterThan.right[0]], 'gt');
    }

    if (token.lessThan) {
        return compileLeftRight([token.lessThan.left[0], token.lessThan.right[0]], 'lt');
    }

    if (token.and) {
        return compileLeftRight([token.and.left[0], token.and.right[0]], 'and');
    }

    if (token.type) {
        if (token.type === 'string') {
            const base64 = Buffer.from(token.value).toString('base64');
            return [put('loadstring', base64)];
        }
        return [put('load', token.value)];
    }

    if (token.let) {
        const ops = compile(token.let.value, memory);
        const varname = token.let.identifier.identifier;
        ops.push(put('store', null, { varname }));
        return ops;
    }

    if (token.identifier) {
        return [put('loadaddr', null, { varname: token.identifier })];
    }

    if (token.return) {
        const ops = compile(token.return, memory);
        return ops.concat([
            put('push'), 
            put('ret')
        ]);
    }

    if (token.body) {
        return token.body.flatMap(t => compile(t, memory));
    }

    if (token.function) {
        const fnName = token.function.name.identifier;
        const body = compile(token.function.body[0]);
        const params = (token.function.parameters || []).flatMap(param => [
            put('pop'),
            put('store' , null, { varname: param.identifier, parameter: true })
        ]);
        params[0].blob.symbol = fnName;
        body[body.length - 1].blob.symbol = `${fnName}__end`;
        return [
            put('jump', null, { label: `${fnName}__end`, add: 1 }) // jump over function
        ]
        .concat(params)
        .concat(body);
    }

    if (token.call) {
        const args = (token.call.arguments || []).flatMap(arg => compile(arg, memory).concat([put('push')]));
        return args.concat([
            put('load', (token.call.arguments || []).length),
            put('next'),
            put('jump', null, { call: token.call.name.identifier })
        ]);
    }

    if (token.if) {
        const ifLabel = crypto.randomUUID(); // create unique labels
        const ifEndLabel = `${ifLabel}__end`;
        const clause = compile(token.if.clause[0], memory);
        const body = compile(token.if.body[0], memory)
        body[0].blob.symbol = ifLabel;
        body[body.length -1].blob.symbol = ifEndLabel;
        return clause
            .concat([
                put('jump?', null, { label: ifLabel }),
                put('jump', null, { label: ifEndLabel, add: 1 }),
            ])
            .concat(body)
    }
    return put('nop', undefined, JSON.stringify(token));
}

function build(opcodes = []) {
    const memory = [];
    const findSymbolAddress = name => opcodes.findIndex(o => o.blob && o.blob.symbol === name);
    const findMemoryAddress = name => memory.findIndex(n => n === name);
    return opcodes.map(code => {
        if (code.op === 'store') {
            const adr = findMemoryAddress(code.blob.varname);
            if (adr === -1 ) {
                const newAdr = memory.length;
                memory.push(code.blob.varname);
                return { op: code.op, value: newAdr }
            }
            return { op: code.op, value: adr }
        }

        if (code.op === 'jump' || code.op === 'jump?' && code.value === null) {
            if (code.blob.label) {
                return {
                    op: code.op,
                    value: findSymbolAddress(code.blob.label) + (code.blob.add || 0),
                    blob: code.blob
                }
            }
            const address = findSymbolAddress(code.blob.call);
            if (address === -1) {
                return {
                    op: 'call',
                    value: code.blob.call
                }
            }
            return {
                op: 'jump',
                value: findSymbolAddress(code.blob.call)
            }
        }

        if (code.op === 'loadaddr') {
            return {
                op: 'loadaddr',
                value: findMemoryAddress(code.blob.varname)
            }
        }

        return code;
    })
    .map((o, i) => ({index: i, ...o}));
}

module.exports = ({
    compile(token) {
        return build(compileAst(token));
    }
});