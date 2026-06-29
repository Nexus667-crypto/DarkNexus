require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
    ]
});

const OWNER_ID = process.env.OWNER_ID;
const TOKEN = process.env.TOKEN;

if (!OWNER_ID) {
    console.error("❌ OWNER_ID n'est pas défini !");
    process.exit(1);
}

client.once('ready', async () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);
    console.log(`👑 Owner : ${OWNER_ID}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    const commandData = {
        name: 'ban-all',
        description: 'Bannit tous les membres du serveur sauf le propriétaire et les bots',
        integration_types: ['UserInstall'],
        contexts: [0], // 0 = Guild
    };

    try {
        // Méthode la plus fiable pour User Install
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [commandData] }
        );
        
        console.log('✅ Commande /ban-all enregistrée en UserInstall (méthode REST)');
        console.log('🔄 Essaie maintenant dans n\'importe quel serveur (même sans le bot dedans)');
    } catch (err) {
        console.error('❌ Erreur REST:', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'ban-all') return;

    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '❌ Seul le propriétaire du bot peut utiliser cette commande.', 
            ephemeral: true 
        });
    }

    if (!interaction.guild) {
        return interaction.reply({ 
            content: '❌ Cette commande ne peut être utilisée que dans un serveur.', 
            ephemeral: true 
        });
    }

    // Vérification critique : le bot doit être dans le serveur
    let botMember;
    try {
        botMember = await interaction.guild.members.fetchMe();
    } catch (e) {
        return interaction.reply({
            content: '❌ **Le bot n\'est pas dans ce serveur !**\n\n' +
                    'Pour utiliser cette commande, tu dois **ajouter le bot** dans le serveur avec la permission `Ban Members`.\n\n' +
                    '**Lien d\'invitation :**\n' +
                    `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`,
            ephemeral: true
        });
    }

    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
            content: '❌ Le bot n\'a pas la permission `Bannir des membres` dans ce serveur.',
            ephemeral: true
        });
    }

    await interaction.reply({ 
        content: '🚨 **BAN ALL EN COURS...** Ne ferme pas Discord. Cela peut prendre plusieurs minutes.',
        ephemeral: false 
    });

    let banned = 0, failed = 0, skipped = 0;

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
                await new Promise(r => setTimeout(r, 700));
            } catch {
                failed++;
            }
        }

        await interaction.followUp({
            content: `✅ **BAN ALL TERMINÉ !**\n\n` +
                    `**✅ Membres bannis :** ${banned}\n` +
                    `**❌ Échecs :** ${failed}\n` +
                    `**⏭️ Ignorés :** ${skipped}`
        });

    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: '❌ Erreur critique pendant l\'exécution.' });
    }
});

client.login(TOKEN);
