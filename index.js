require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
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

    const command = {
        name: 'ban-all',
        description: 'Bannit tous les membres du serveur (User Install)',
        
        // Configuration pour fonctionner partout via User Install
        integration_types: ['UserInstall'],           // ← Important : seulement UserInstall
        contexts: [0],                                // 0 = Guild (serveur)
        
        // On enlève complètement default_member_permissions
    };

    try {
        await client.application.commands.create(command);
        console.log('✅ Commande /ban-all enregistrée en UserInstall (devrait marcher partout)');
    } catch (err) {
        console.error('❌ Erreur lors de la création de la commande:', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'ban-all') return;

    // Restriction propriétaire
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ 
            content: '❌ Seul le propriétaire du bot peut utiliser cette commande.', 
            ephemeral: true 
        });
    }

    // Vérification qu'on est bien dans un serveur
    if (!interaction.guild || !interaction.guildId) {
        return interaction.reply({
            content: '❌ Cette commande doit être utilisée dans un serveur.',
            ephemeral: true
        });
    }

    // Vérification que le bot a les permissions nécessaires dans le serveur
    const botMember = await interaction.guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({
            content: '❌ Le bot n\'a pas la permission de bannir des membres dans ce serveur.\n\n' +
                    'Il faut que tu ajoutes le bot avec les permissions nécessaires ou que tu lui donnes le rôle Administrateur.',
            ephemeral: true
        });
    }

    await interaction.reply({ 
        content: '🚨 **BAN ALL EN COURS...** Cela peut prendre plusieurs minutes. Ne ferme pas Discord.',
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
                await new Promise(r => setTimeout(r, 800)); // Anti rate-limit plus sécurisé
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
        await interaction.followUp({ 
            content: '❌ Une erreur grave est survenue pendant le ban all.' 
        });
    }
});

client.login(process.env.TOKEN);
