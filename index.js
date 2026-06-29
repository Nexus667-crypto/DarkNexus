require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, ApplicationCommandType } = require('discord.js');

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
    console.log(`👑 Propriétaire : ${OWNER_ID}`);

    // === COMMANDE INSTALLABLE SUR PROFIL (User Install) ===
    const command = new SlashCommandBuilder()
        .setName('ban-all')
        .setDescription('Bannit tous les membres du serveur (sauf toi et les bots)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setIntegrationTypes([0, 1])     // 0 = Guild, 1 = User Install
        .setContexts([0, 1, 2]);         // 0 = Guild, 1 = Bot DM, 2 = Group DM

    try {
        await client.application.commands.create(command);
        console.log('✅ Commande /ban-all enregistrée en mode User Install (fonctionne partout)');
    } catch (err) {
        console.error('Erreur création commande:', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'ban-all') return;

    // Vérification propriétaire
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '❌ Seul le propriétaire du bot peut utiliser cette commande.', 
            ephemeral: true 
        });
    }

    // Vérification que c'est bien dans un serveur
    if (!interaction.guild) {
        return interaction.reply({
            content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
            ephemeral: true
        });
    }

    await interaction.reply({ 
        content: '🚨 **BAN ALL EN COURS...** Cela peut prendre plusieurs minutes selon la taille du serveur.',
        ephemeral: false 
    });

    let banned = 0;
    let failed = 0;
    let skipped = 0;

    try {
        const members = await interaction.guild.members.fetch({ withPresences: false });

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
                await new Promise(r => setTimeout(r, 800)); // Anti-rate limit plus safe
            } catch (err) {
                failed++;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        await interaction.followUp({
            content: `✅ **BAN ALL TERMINÉ !**\n\n` +
                    `**✅ Membres bannis :** ${banned}\n` +
                    `**❌ Échecs :** ${failed}\n` +
                    `**⏭️ Ignorés (toi + bots + non bannissables) :** ${skipped}`,
            ephemeral: false
        });

    } catch (error) {
        console.error(error);
        await interaction.followUp({ 
            content: '❌ Une erreur grave est survenue pendant le ban-all.',
            ephemeral: true 
        });
    }
});

client.login(process.env.TOKEN);
