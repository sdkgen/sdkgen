import child_process from 'child_process'

export const exec = (command: string) => {
    return new Promise((fulfil, reject) => {
	child_process.exec(command, (err, stdout, stderr) => {
	    if (err) {
		reject(err);
		return;
	    }

	    fulfil({ stdout, stderr });
	});
    });
}
