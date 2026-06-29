require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ]
});

const OWNER_ID = process.env.OWNER_ID;

if (!OWNER_ID) {
    console.error("❌ OWNER_ID n'est pas défini dans les variables d'environnement !");
    process.exit(1);
}

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    console.log(`👑 Propriétaire configuré : ${OWNER_ID}`);

    try {
        await client.application.commands.create({
            name: 'ban-all',
            description: 'Bannit tous les membres du serveur sauf le propriétaire et les bots',
            default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        });
        console.log('✅ Commande /ban-all enregistrée globalement (disponible partout)');
    } catch (err) {
        console.error('Erreur lors de la création de la commande:', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'ban-all') return;

    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '❌ Seul le propriétaire du bot peut utiliser cette commande.', 
            ephemeral: true 
        });
    }

    await interaction.reply({ 
        content: '🚨 **BAN ALL EN COURS...** Ne ferme pas Discord. Cela peut prendre plusieurs minutes.', 
        ephemeral: false 
    });

    let banned = 0;
    let failed = 0;
    let skipped = 0;

    try {
        const members = await interaction.guild.members.fetch();

        for (const [id, member] of members) {
            if (id === OWNER_ID || member.user.bot || !member.bannable) {
                skipped++;
                continue;
            }

            try {
                await member.ban({
                    reason: `BanAll par ${interaction.user.tag}`,
                    deleteMessageSeconds: 0
                });
                banned++;
                await new Promise(r => setTimeout(r, 700)); // Anti rate-limit
            } catch (err) {
                failed++;
            }
        }

        await interaction.followUp({
            content: `✅ **BAN ALL TERMINÉ !**\n\n` +
                    `**✅ Membres bannis :** ${banned}\n` +
                    `**❌ Échecs :** ${failed}\n` +
                    `**⏭️ Ignorés (toi + bots) :** ${skipped}`
        });

    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: '❌ Une erreur grave est survenue.' });
    }
});

client.login(process.env.TOKEN);
