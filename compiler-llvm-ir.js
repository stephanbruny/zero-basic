const ir = require('llvm-ir');

const llvmTypeMap = {
    int: 'i32',
    word: 'i16', 
    byte: 'i8'
};

function compileAst(token = {}) {
    if (token.let) {
        const ops = compile(token.let.value, memory);
        const varname = token.let.identifier.parameter.name;
        return [`@${varname}`]
    }
    ir.create({  })
}

module.exports = {
    compile: compileAst
}