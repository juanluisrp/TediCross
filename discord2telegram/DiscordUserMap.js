"use strict";

/**************************
 * Import important stuff *
 **************************/

const fs = require("fs");
const _ = require("lodash");

/** Map containing instances of DiscordUserMap objects */
const instanceMap = new Proxy({}, {
	get(target, name) {
		// Check if the instance exists
		if (!(name in target)) {
			// Nope. Create a dummy entry to tell the constructor everything is OK
			target[name] = "Kake";

			// Create the instance
			target[name] = new DiscordUserMap(name);
		}

		// Return the instance
		return target[name];
	}
});

/****************************
 * The DiscordUserMap class *
 ****************************/

/**
 * Handles the mapping between UserID and Username in Discord and saves it to a file when it changes
 */
class DiscordUserMap {
	/**
	 * Creates a new mapping betweein user IDs and usernames
	 *
	 * @param {String} filename	Name of the file read the map from and store it to
	 *
	 * @private
	 */
	constructor(filename) {
		// Check if this instance is allowed to be created
		if (instanceMap[filename] !== "Kake") {
			// Nope. Complain
			throw new Error("Not authorized to create an instance. Please go through the 'getInstance' function of the class");
		}

		/**
		 * The filename this map is associated with
		 *
		 * @private
	 	 */
		this._filename = filename;

		try {
			// Check if the file exists. This throws if it doesn't
			fs.accessSync(this.filename, fs.constants.F_OK);
		} catch (e) {
			// Nope, it doesn't. Create it
			fs.writeFileSync(this.filename, JSON.stringify({}));
		}

		// Read the file
		let data = fs.readFileSync(this.filename);

		// Parse it as JSON
		try {
			data = JSON.parse(data);
		} catch(e) {
			// Invalid JSON. Log it, and start with an empty object
			console.warn(`Invalid JSON in ${this.filename}:\n\n${data}\n\nStarting with empty usermap`);
			data = {};
		}

		/**
		 * The mapping between IDs and names
		 *
		 * @private
		 */
		this._idToName = data;

		/**
		 * The mapping between names and IDs
		 *
		 * @private
		 */
		this._nameToId = {};
		for (let id in data) {
			this._nameToId[data[id].toLowerCase()] = id;
		}

		/**
		 * A promise which resolves to nothing when the file is ready for writing
		 *
		 * @private
		 */
		this._finishedWriting = Promise.resolve();

		// Make the _saveMap method debounced, to not save every damn change
		this._saveMap = _.debounce(this._saveMap, 500);
	}

	/**
	 * Writes the current map to file
	 *
	 * @private
	 */
	_saveMap() {
		// Create the next "finishedWriting" promise
		let p = new Promise((resolve, reject) => {
			// Wait for the previous write operation to finish
			this._finishedWriting.then(() => {

				// Write the map to file
				fs.writeFile(this._filename, JSON.stringify(this._idToName, null, "\t"), {encoding: "utf-8"}, err => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		});

		// Log an error if the write failed
		p = p.catch(err => console.error("Writing discord user map failed!", err));
		
		// Set the new "finishedWriting" promise
		this._finishedWriting = p;
	}

	/**
	 * Maps a username to an ID. Example: nameMap.mapUsername("Foo").toID(123);
	 *
	 * @param {String} username	The username to map to an ID
	 *
	 * @return {Object}	An object with a 'toID' property, which is used to complete the mapping
	 */
	mapUsername(username) {
		return {
			toID: id => {
				// Check if the mapping exists
				if (this._nameToId[username] !== id) {
					// Nope. Create or update it
					this._nameToId[username.toLowerCase()] = id;
					this._idToName[id] = username;

					// Save it
					this._saveMap();
				}
			}
		};
	}

	/**
	 * Maps an ID to a username. Example: nameMap.mapID(123).toUsername("Foo");
	 *
	 * @param {String} id	The ID to map to a username
	 *
	 * @return {Object}	An object with a 'toUsername' property, which is used to complete the mapping
	 */
	mapID(id) {
		return {
			toUsername: username => {
				// Check if the mapping exists
				if (this._idToName[id] !== username) {
					// Nope. Create or update it
					this._nameToId[username.toLowerCase()] = id;
					this._idToName[id] = username;

					// Save it
					this._saveMap();
				}
			}
		};
	}

	/**
	 * Looks up an ID and returns a username
	 *
	 * @param {String} id	The ID to look up
	 *
	 * @return {String}	The username this ID belongs to
	 */
	lookupID(id) {
		return this._idToName[id];
	}

	/**
	 * Looks up a username and returns an ID
	 *
	 * @param {String} username	The name to look up
	 *
	 * @return {String}	The ID this username belongs to
	 */
	lookupUsername(username) {
		return this._nameToId[username.toLowerCase()];
	}

	/**
	 * The filename this map is linked to
	 */
	get filename() {
		return this._filename;
	}

	/**
	 * The mapping between names and IDs
	 */
	get nameToIdMap() {
		return _.clone(this._nameToId);
	}

	/**
	 * The mapping between IDs and names
	 */
	get idToNameMap() {
		return _.clone(this._idToName);
	}

	/**
	 * Tries to get an existing instance of a DiscordUserMap. It there is none, it will create one
	 */
	static getInstance(filename) {
		return instanceMap[filename];
	}
}

/********************
 * Export the class *
 ********************/

module.exports = DiscordUserMap;
