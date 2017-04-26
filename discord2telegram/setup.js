"use strict";

/**************************
 * Import important stuff *
 **************************/

const settings = require("../settings");
const DiscordUserMap = require("./DiscordUserMap");
const md2html = require("./md2html");

/**********************
 * The setup function *
 **********************/

/**
 * Sets up the receiving of Discord messages, and relaying them to Telegram
 *
 * @param {Discord.Client} dcBot	The Discord bot
 * @param {BotAPI} tgBot	The Telegram bot
 */
function setup(dcBot, tgBot) {
	// Get the instance of the DiscordUserMap
	const dcUsers = DiscordUserMap.getInstance(settings.discord.usersfile);

	// Save the bot's known users when the bot is ready
	dcBot.on("ready", () => {
		// Save the bot's usermap
		for (let [userId, {username}] of dcBot.users) {

			// Store the UserID/Username mapping
			if (username && userId) {
				dcUsers.mapID(userId).toUsername(username);
			}
		}
	});

	// Listen for presence to get name/ID mapping
	dcBot.on("presenceUpdate", (oldMember, newMember) => {
		// Get info about the user
		let userName = newMember.user.username;
		let userId = newMember.user.id;

		// Store the UserID/Username mapping
		dcUsers.mapID(userId).toUsername(userName);
	});

	// Listen for Discord messages
	dcBot.on("message", message => {

		// Check if this is a request for server info
		if (message.cleanContent.toLowerCase() === `@${dcBot.user.username} chatinfo`.toLowerCase()) {
			// It is. Give it
			message.reply(
				"channelID: " + message.channel.id + "\n" +
				"serverID: " + message.guild.id + "\n"
			);
			return;
		}

		// Get info about the sender
		let senderName = message.author.username;
		let senderId = message.author.id;

		// Store the UserID/Username mapping
		dcUsers.mapID(senderId).toUsername(senderName);

		// Don't do anything with the bot's own messages
		if (senderId !== dcBot.user.id) {

			// Check if the message is from the correct chat
			if (message.channel.id == (process.env.DISCORD_CHANNELID || settings.discord.channelID)) {

				// Modify the message to fit Telegram
				let processedMessage = md2html(message.cleanContent);
				let tgChatId = process.env.TELEGRAM_CHATID || settings.telegram.chatID;

				// Check for attachments and pass them on
				message.attachments.forEach(({url}) => {
					tgBot.sendMessage({
						chat_id: tgChatId,
						text: url
					})
					.catch(err => console.error("Telegram did not accept an attachment:", err));
				});

				// Pass the message on to Telegram
				tgBot.sendMessage({
					chat_id: tgChatId,
					text: `<b>${senderName}</b>\n${processedMessage}`,
					parse_mode: "HTML"
				})
				.catch(err => console.error("Telegram did not accept a message:", err));
			} else if (message.channel.guild && (message.channel.guild.id != (process.env.DISCORD_SERVERID || settings.discord.serverID))) {	// Check if it is the correct server
				// Inform the sender that this is a private bot
				message.reply("This is an instance of a TediCross bot, bridging a chat in Telegram with one in Discord. If you wish to use TediCross yourself, please download and create an instance. You may ask @Suppen for help");
			} else {
				//message.reply("I'm a bot and you wrote\n" + message.cleanContent);
			}
		}
	});

	// Start the Discord bot
	dcBot.login(process.env.DISCORD_TOKEN || settings.discord.auth.token).catch(err => console.error("Could not authenticate the Discord bot:", err));
}

/*****************************
 * Export the setup function *
 *****************************/

module.exports = setup;
