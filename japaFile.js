const { configure } = require('japa')
const { argv } = require('yargs')
require('@adonisjs/require-ts/build/register')

const { files = ['test/**/*.spec.ts'], grep } = argv
configure({
	files: Array.isArray(files) ? files : [files],
	grep: grep,
})
