const express = require("express");
const app = express();
const http = require('http');
const mysql = require("mysql");
const path = require('path');
const socket = require("socket.io");
const server = http.createServer(app);

const utiliseBDD = true;
const envoieStatBDD = false;
const pointPourGagner = 66;

let bd = null;
let jeux = [];

const io = new require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const Joueur = class {
    constructor(user, cartes, points, selection, joue, mise, bot, strat){
        this.user = user;
        this.cartes = cartes;
        this.points = points;
        this.selection = selection;
        this.joue = joue;
        this.mise = mise;
        this.bot = bot;
        this.strat = strat;
    }
};

const Jeu = class {
    constructor(host, maxJoueurs, joueurs, state, chat, type, lignes, plateau, manche, maxManche, cacheState, ordre, deck, terminer, joueurJoue, distribution, bot) {
        this.host = host;
        this.maxJoueurs = maxJoueurs;
        this.joueurs = joueurs;
        this.state = state;
        this.chat = chat;
        this.type = type;
        this.lignes = lignes;
        this.plateau = plateau; 
        this.manche = manche;
        this.maxManche = maxManche;
        this.cacheState = cacheState;
        this.ordre = ordre;
        this.ordreIndex = 0;
        this.deck = deck;
        this.terminer = terminer;
        this.joueurJoue = joueurJoue;
        this.distribution = distribution;
        this.bot = bot;
    }
};

app.use(express.static(path.join(__dirname, 'public/')));
server.listen(8000);

if (utiliseBDD) { 
    bd = mysql.createConnection({
        host : "mysql.etu.umontpellier.fr",
        user : "e20210005280",
        password : "DoubleSpinningEdge",
        database : "e20210005280"
    });
    bd.connect(function(err){
        if (err) {
            return console.error(err.code);
        }
        console.log("Connecter à BDD");
    });    
} else {
    console.log("Mode sans BDD");
}


io.on('connection', socket => {
    socket.on('ajoutJeu', data => {
        
        let j = new Jeu(data.host, parseInt(data.max), [], "pending", "", data.type, [[], [], [], []], [], 1, data.manche, true, 0, [], false, 0, false, 0);
        ajouteJoueurDansJeu(j, data.host);
        jeux.push(j);
    });

    socket.on('quitteJeu', data => {
        let jeu = retourneJeuDuJoueur(data.user);

        if (jeu != null){
            enleveJoueurDansJeu(jeu, data.user);

            let hostFound = false;

            for (let joueur of jeu.joueurs){
                if (joueur.user == jeu.host){
                    hostFound = true
                }
            }

            if (!hostFound){
                let newJeux = [];
                for (let j of jeux){
                    if (j.host != jeu.host) {
                        newJeux.push(j)
                    }
                }
                jeux = newJeux;
            }
        }
    });

    socket.on('rejoindreJeu', data => {
        let j = retourneJeuDuJoueur(data.host)
        ajouteJoueurDansJeu(j,data.user)

        socket.emit("rejoindreJeu2", true);
    });

    socket.on('retourneJeux', data => {
        socket.emit('retourneJeux2', jeux);
    });
    
    //socket rajouter une personne dans la bdd
    socket.on('signup', data => {
        if (utiliseBDD){
            ajoutJoueurBDD(data.user, data.pass);
        }
    });

    //socket pour vérifier si un joueur est dans la bdd et si oui alors il est "connecté"
    socket.on('demandeConnexion', data => {
        if (utiliseBDD) {
            let requete = "SELECT user FROM joueurs WHERE user = '" + data.user + "' AND password = MD5('" + data.pass + "')";
            bd.query(requete, (error, results, fields) => {
                if (results.length >= 1) {
                    socket.emit('loginOUT', true);
                } else {
                    socket.emit('loginOUT', false);
                }
            });
        } else {
            socket.emit('loginOUT', true);
        }
    });

    //socket pour retourner à la page principale après avoir finis un jeu
    socket.on('retour', user => {
        let jeulol = retourneJeuDuJoueur(user)
        let array = []

        for (let jeu of jeux){
            if (jeu.host != jeulol.host){
                array.push(jeu)
            }
        }

        jeux = array;
        socket.emit('retour2');
    });

    //socket pour retourner le jeu d'un joueur spécifique
    socket.on('returnJoueurJeu', data => {
        let p = null;
        for (let jeu of jeux){
            for (let joueur of jeu.joueurs){
                if (joueur.user == data.user){
                    p = jeu
                }
            }
        }
        if (p != null){
            socket.emit('returnJoueurJeu2', p);
        }
    });

    //socket pour retourner le jeu d'un joueur spécifique
    socket.on('updateClientRequest', data => {
        let p = null;
        for (let jeu of jeux){
            for (let joueur of jeu.joueurs){
                if (joueur.user == data.user){
                    p = jeu
                }
            }
        }
        if (p != null){
            socket.emit('updateClientReceived', p);
        }
    });

    //socket pour gérer la séléction d'une carte dans la main des joueurs ****************
    socket.on('ajouteCarteCache', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let carteJoue = null;
        let joueur = retourneJoueurDuJeu(data.user, jeu);
        let nouveauMain = [];

        carteJoue = retirerCarte(joueur, data.valeur);
        
        for (let carte of joueur.cartes){
            if (carte.valeur != carteJoue.valeur){
                nouveauMain.push(carte);
            }
        }

        if (!joueur.joue && carteJoue != null){
            let p = {valeur: carteJoue.valeur, boeuf: carteJoue.boeuf, prop: data.user}
            jeu.plateau.push(p);
            joueur.joue = true;
            joueur.cartes = nouveauMain;
        }

        if (jeu.plateau.length == jeu.joueurs.length){
            rangeCarteCroissant(jeu.plateau);
            
            let ordreJoueurs = [];
            for (let carte of jeu.plateau){
                ordreJoueurs.push(carte.prop);
            }
            ordreJoueurs = inverseListe(ordreJoueurs);

            jeu.ordre = ordreJoueurs;

            console.log(jeu.ordre);
            
            jeu.cacheState = false;
            jeu.ordreIndex = 0;
            socket.emit('placementCartes2');
        }
    });

    socket.on('placementCartes', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let next_joueur = jeu.ordre[jeu.ordreIndex]

        if (data.user == next_joueur) {
            let carte_jouer = null;

            for (let carte of jeu.plateau){
                if (carte.prop == next_joueur){
                    carte_jouer = carte;
                }
            }
            
            if (carte_jouer != null){
                let counter = 0;
    
                for (let ligne of jeu.lignes){
                    if (ligne[ligne.length-1].valeur > carte_jouer.valeur){
                        counter += 1;
                    }
                }
                
                if (counter != 4){
                    let joueur = retourneJoueurDuJeu(data.user, jeu)
                    let indexesJouables = NombreDeCroissants(jeu.lignes, carte_jouer);
                    let diffTab = [];
                    let minIndex = 0;
                
                    for (let index of indexesJouables){
                        jeu.lignes[index]
                        let liste = jeu.lignes[index]
                        let diff = carte_jouer.valeur - liste[liste.length-1].valeur;
                        diffTab.push({val: diff, index: index});
                    }
                
                    let min = 0;
                    for (let couple of diffTab){
                        if (min > couple.val){
                            min = couple.val;
                            minIndex = couple.index;
                        }
                    }
                    
                    let index_bonne = diffTab[minIndex].index;
    
                    if (jeu.lignes[index_bonne].length < 5){
                        jeu.lignes[index_bonne].push(carte_jouer);
                    } else {
                        joueur.points += SommeTete(jeu.lignes[index_bonne]);
                        jeu.lignes[index_bonne] = [];
                        jeu.lignes[index_bonne].push(carte_jouer);
                    }
    
    
                    let new_plateau = [];
    
                    for (let carte of jeu.plateau){
                        if (carte.valeur != carte_jouer.valeur){
                            new_plateau.push(carte);
                        }
                    }
    
                    jeu.plateau = new_plateau;
    
                    jeu.ordreIndex += 1;
                    joueur.joue = true;
                    socket.emit('placementCartes2');
                }
            }
        }

        if (jeu.ordreIndex == jeu.joueurs.length){
            jeu.cacheState = true;
            jeu.plateau = [];
            jeu.ordreIndex = 0;
            for (let joueur of jeu.joueurs){
                joueur.joue = false;
            }
        }

        let fin = false;
        let joueur_gagnant = false;
        
        for (let joueur of jeu.joueurs){
            if (joueur.cartes.length == 0) {
                fin = true;
            }

            if ((joueur.points) >= 66) {
                joueur_gagnant = joueur;
            }
        }
        if (fin) {
            jeu.manche += 1;
        }

        for (let joueur of jeu.joueurs){
            if (joueur.cartes.length == 0) {
                jeu.deck = genererCartes6QuiPrend();

                melangeCartes(jeu.deck);
                DistribueCarte(jeu, jeu.deck, 10);
                
                let temp = [];
                for (let i = 0; i < 4; i++){
                    temp.push(jeu.deck.pop())
                }
    
                rangeCarteCroissant(temp)
                
                for (let i = 0; i < 4; i++){
                    jeu.lignes[i] = []
                    jeu.lignes[i].push(temp.pop())
                }
            }   
        }

        if (jeu.manche >= jeu.maxManche) {
            io.emit('terminerJeu', jeu);
            terminerJeu(jeu);
        }       
    });

    socket.on('botJoue', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        
        if (jeu.cacheState){
            for (let joueur of jeu.joueurs){
                if (joueur.bot && !joueur.joue) {
                    let strat = joueur.strat
                    let index = 0
                    let nouveauMain = [];

                    if (strat == "random"){
                        index = Math.floor(Math.random() * joueur.cartes.length);
                    }
        
                    if (strat == "min"){
                        let min = joueur.cartes[0].valeur
        
                        for (let i = 0; i < joueur.cartes.length; i++){
                            let carte = joueur.cartes[i]
                            if (carte.valeur < min) {
                                min = carte.valeur
                                index = i
                            }
                        }
                    }
        
                    if (strat == "max"){
                        let max = joueur.cartes[0].valeur
                        for (let i = 0; i < joueur.cartes.length; i++){
                            let carte = joueur.cartes[i]
                            if (carte.valeur > max) {
                                max = carte.valeur
                                index = i
                            }
                        }
                    }

                    let carte = joueur.cartes[index].valeur
                    carteJoue = retirerCarte(joueur, carte);
                    
                    for (let carte of joueur.cartes){
                        if (carte.valeur != carteJoue.valeur){
                            nouveauMain.push(carte);
                        }
                    }
                    
                    if (carteJoue != null){
                        let p = {valeur: carteJoue.valeur, boeuf: carteJoue.boeuf, prop: joueur.user}
                        jeu.plateau.push(p);
                        joueur.cartes = nouveauMain;
                    }
        
                    joueur.joue = true
                }
            }

            if (jeu.plateau.length == jeu.joueurs.length){
                rangeCarteCroissant(jeu.plateau);
                let ordreJoueurs = [];

                for (let carte of jeu.plateau){
                    ordreJoueurs.push(carte.prop);
                }
                ordreJoueurs = inverseListe(ordreJoueurs);
                jeu.ordre = ordreJoueurs;
                jeu.cacheState = false;
                jeu.ordreIndex = 0;
            }

        } else {
            let bot_prio = jeu.ordre[jeu.ordreIndex]
            let bot_a_joue = null
            let carte_jouer = null;

            for (let joueur of jeu.joueurs){
                if (joueur.bot && joueur.user == bot_prio) {
                    bot_a_joue = joueur
                }
            }

            if (bot_a_joue != null) {
                let new_plateau = [];
                let counter = 0;   

                for (let carte of jeu.plateau){
                    if (carte.prop == bot_prio){
                        carte_jouer = carte;
                    }
                }
                for (let ligne of jeu.lignes){
                    if (ligne[ligne.length-1].valeur > carte_jouer.valeur){
                        counter += 1;
                    }
                }

                if (counter != 4){
                    let indexesJouables = NombreDeCroissants(jeu.lignes, carte_jouer);
                    let diffTab = [];
                    let minIndex = 0;
                
                    for (let index of indexesJouables){
                        jeu.lignes[index]
                        let liste = jeu.lignes[index]
                        let diff = carte_jouer.valeur - liste[liste.length-1].valeur;
                        diffTab.push({val: diff, index: index});
                    }
                
                    let min = 0;
                    for (let couple of diffTab){
                        if (min > couple.val){
                            min = couple.val;
                            minIndex = couple.index;
                        }
                    }
                    
                    let index_bonne = diffTab[minIndex].index;
    
                    if (jeu.lignes[index_bonne].length < 5){
                        jeu.lignes[index_bonne].push(carte_jouer);
                    } else {
                        bot_a_joue.points += SommeTete(jeu.lignes[index_bonne]);
                        jeu.lignes[index_bonne] = [];
                        jeu.lignes[index_bonne].push(carte_jouer);
                    }

                    for (let carte of jeu.plateau){
                        if (carte.valeur != carte_jouer.valeur){
                            new_plateau.push(carte);
                        }
                    }

                    jeu.plateau = new_plateau;
                } else {
                    let min = SommeTete(jeu.lignes[0]);
                    let ligne_index = 0;

                    for (let i = 0; i < 3; i++){
                        p = SommeTete(jeu.lignes[i])
                        if (p < min){
                            min = p
                            ligne_index = i
                        }
                    }

                    if (jeu.lignes[ligne_index].length < 5){
                        jeu.lignes[ligne_index].push(carte_jouer);
                    } else {
                        bot_a_joue.points += SommeTete(jeu.lignes[ligne_index]);
                        jeu.lignes[ligne_index] = [];
                        jeu.lignes[ligne_index].push(carte_jouer);
                    }

                    jeu.plateau = new_plateau;
                }

                jeu.ordreIndex += 1;
            }

            if (jeu.ordreIndex == jeu.joueurs.length){
                jeu.cacheState = true;
                jeu.plateau = [];
                jeu.ordreIndex = 0;

                for (let joueur of jeu.joueurs){
                    joueur.joue = false;
                }
            }
        }
    });

    socket.on('ajouteBot', data => {
        let jeu = retourneJeuDuJoueur(data.user);

        if (jeu.joueurs.length < jeu.maxJoueurs){
            jeu.joueurs.push(new Joueur("bot_" + data.strat + jeu.bot, [], 0, [], false, 100, true, data.strat));
            jeu.bot += 1
        }
    });

    socket.on('piocheCarte', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let joueur = retourneJoueurDuJeu(data.user, jeu);

        if (!joueur.joue) {
            let carteJoue = joueur.cartes.pop();
            carteJoue.prop = data.user;
            jeu.plateau.push(carteJoue);
            joueur.joue = true;

            if (jeu.plateau.length == jeu.joueurs.length){
                jeu.cacheState = false;

                let max = CarteValeurMaxListe(jeu.plateau)
                let bataille = NbCarteValeurMaxListe(jeu.plateau, max) > 1
                let carteADonne = [];
                let vainqueur = null;

                if (bataille) {
                    let joueursBataille = ListeJoueurValMax(jeu.joueurs, max)
                    let batailleInfo = bataille2(joueursBataille, jeu.joueurs, jeu.plateau)
                    let carteRecup = batailleInfo[1]
                    let joueurGagnant = batailleInfo[0]
                    vainqueur = retourneJoueurDuJeu(joueurGagnant, jeu);

                    carteADonne = carteRecup
                    console.log(joueurGagnant + " remporte la bataille");
                } else {
                    let joueurGagnant = ListeJoueurValMax(jeu.joueurs, max)[0]
                    vainqueur = retourneJoueurDuJeu(joueurGagnant, jeu);

                    carteADonne = jeu.plateau;
                    console.log(joueurGagnant + " remporte avec regle max");
                }

                setTimeout(() => {
                    jeu.plateau = []
                    jeu.cacheState = true;
                    jeu.manche += 1;

                    for (let joueur of jeu.joueurs){
                        joueur.joue = false;
                    }
                    vainqueur.cartes = CustomPush(vainqueur.cartes, carteADonne);
                }, "1500");
            }

            if (!jeu.terminer && jeu.manche >= jeu.maxManche){
                io.emit('terminerJeu', jeu);
                terminerJeu(jeu);
            }
        }
    });
    
    //socket pour gérer la séléction d'une ligne quand un joueur à joué une carte inferieur à toute **********
    socket.on('ligneChoisieParJoueur', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let joueur = retourneJoueurDuJeu(data.user, jeu);
    
        if (data.user == jeu.ordre[jeu.ordreIndex]) {
            let joueurCarte = null;
            let newPlateau = [];
    
            for (let carte of jeu.plateau){
                if (carte.prop == data.user){
                    joueurCarte = carte;
                } else {
                    newPlateau.push(carte);
                }
            }   
            
            if (jeu.plateau.length != 0) {
                joueur.points += SommeTete(jeu.lignes[data.index]); 
                jeu.lignes[data.index] = []
                jeu.lignes[data.index].push({valeur: joueurCarte.valeur, boeuf: joueurCarte.boeuf});
                jeu.plateau = newPlateau;
            }

            jeu.ordreIndex += 1;
            joueur.joue = true;
            socket.emit('placementCartes2');
        }
    });

    //socket pour commencé un jeu quand le hote à clické sur "Démarrer le jeu"
    socket.on('commenceJeu', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        jeu.state = "active"
        
        //INIT JEU BATAILLE
        if (jeu.type == "bataille"){
            jeu.deck = genererCarteBataille();

            melangeCartes(jeu.deck);

            while (jeu.deck != 0){
                for (let joueur of jeu.joueurs){
                    let c = jeu.deck.pop()
                    c.prop = joueur.user

                    joueur.cartes.push(c);
                }
            }
        }

        //INIT JEU 6QP
        if (jeu.type == "6qp"){
            jeu.deck = genererCartes6QuiPrend();

            melangeCartes(jeu.deck);
            DistribueCarte(jeu, jeu.deck, 10);

            jeu.manche = 1;
            
            let temp = [];
            for (let i = 0; i < 4; i++){
                temp.push(jeu.deck.pop())
            }

            rangeCarteCroissant(temp)
            
            for (let i = 0; i < 4; i++){
                jeu.lignes[i].push(temp.pop())
            }
        }

        //INIT JEU SOLITAIRE
        if (jeu.type == "solitaire"){
            jeu.deck = genererCarteSolitaire();
            melangeCartes(jeu.deck);

            jeu.lignes = [[], [], [], [], [], [], []];
            jeu.plateau = [[], [], [], []];

            for (let i = 0; i < 7; i++){
                for (let k = 0; k < i+1; k++){
                    let c = jeu.deck.pop();
                    jeu.lignes[i].push(c);
                }
                let l = jeu.lignes[i].length-1
                jeu.lignes[i][l].cache = false;
            }

            jeu.ordre = [];

            for (let joueur of jeu.joueurs){
                jeu.ordre.push(joueur.user);
            }   
            jeu.ordreIndex = 0;
        }

        io.emit('start', {host: jeu.host})
    });

    socket.on('demande_carte_solitaire', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let joueur = retourneJoueurDuJeu(data.user, jeu);
        let c = jeu.deck.pop();

        jeu.manche += 1;

        if (joueur.cartes.length == 0){
            joueur.cartes.push(c);
        } else {
            let m = joueur.cartes[0];
            jeu.deck = CustomPush(jeu.deck, [m]);
            joueur.cartes = [];

            joueur.cartes.push(c);
        }
    });

    socket.on('selection_carte_solitaire', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        let joueur = retourneJoueurDuJeu(data.user, jeu);

        if (joueur.selection.length < 2) {
            joueur.selection.push(data.objet);
        }   

        if (joueur.selection.length == 2){
            let premiere = joueur.selection[0];
            let deuxieme = joueur.selection[1];


            //ligne -> vide
            if ((deuxieme == "vide") && (premiere.nom == "roi")){
                let index1 = -1;
                let tab_index = 0

                for (let i = 0; i < jeu.lignes.length; i++){
                    let m = 0
                    for (let carte of jeu.lignes[i]){
                        if (premiere.symbole == carte.symbole && premiere.valeur == carte.valeur){
                            index1 = i
                            tab_index = m
                        }
                        m += 1;
                    }
                }

                let cartes = [];
    
                if (index1 !== -1) {
                    cartes = jeu.lignes[index1].slice(tab_index);
                    jeu.lignes[index1] = jeu.lignes[index1].slice(0, tab_index);
                } else {
                    joueur.cartes = [];
                    cartes.push(premiere);
                }

                for (let carte of cartes){
                    jeu.lignes[data.index].push(carte);
                }   

                jeu.manche += 1;
            }
        
            if ((deuxieme != "vide" && deuxieme.valeur == undefined) || premiere.valeur == undefined){
                //plateau -> ligne
                if (deuxieme.valeur == undefined){
                    let length = jeu.plateau[deuxieme].length;
                    let carte = jeu.plateau[deuxieme][length-1];
                    let val = 0;

                    if (carte == undefined) {
                        val = 1
                    } else {
                        val = carte.valeur + 1
                    }

                    if (premiere.valeur == val) {
                        jeu.plateau[deuxieme].push(premiere);
                        let index = -1;
                        for (let i = 0; i < jeu.lignes.length; i++){
                            for (let carte of jeu.lignes[i]){
                                if (premiere.symbole == carte.symbole && premiere.valeur == carte.valeur){
                                    index = i
                                }
                            }
                        }

                        if (index != -1){
                            jeu.lignes[index].pop();
                        }
                    }
                } else {

                    //ligne -> plateau
                    let carte_plateau = jeu.plateau[premiere].pop();
                    if (carte_plateau != undefined) {
                        let index = 0;
                        for (let i = 0; i < jeu.lignes.length; i++){
                            for (let carte of jeu.lignes[i]){
                                if (deuxieme.symbole == carte.symbole && deuxieme.valeur == carte.valeur){
                                    index = i
                                }
                            }
                        }

                        let length = jeu.lignes[index].length-1
                        let ligne_carte = jeu.lignes[index][length];

                        if (carte_plateau.valeur + 1 == ligne_carte.valeur){
                            jeu.lignes[index].push(carte_plateau);
                        }
                    }
                }
                joueur.cartes = [];
            }

            //ligne -> ligne
            if (deuxieme.valeur != undefined && premiere.valeur != undefined){
                let valide = false;
                if ((premiere.valeur + 1 == deuxieme.valeur)){
                    if ((premiere.couleur == "rouge" && deuxieme.couleur == "noire") || (premiere.couleur == "noire" && deuxieme.couleur == "rouge")){
                        valide = true;
                    }
                }
                // valide = true;
                if (valide){
                    let index1 = -1;
                    let tab_index = 0

                    for (let i = 0; i < jeu.lignes.length; i++){
                        let m = 0
                        for (let carte of jeu.lignes[i]){
                            if (premiere.symbole == carte.symbole && premiere.valeur == carte.valeur){
                                index1 = i
                                tab_index = m
                            }
                            m += 1;
                        }
                    }

                    let index2 = 0;
                    for (let i = 0; i < jeu.lignes.length; i++){
                        for (let carte of jeu.lignes[i]){
                            if (deuxieme.symbole == carte.symbole && deuxieme.valeur == carte.valeur){
                                index2 = i
                            }
                        }
                    }

                    let cartes = [];
    
                    if (index1 !== -1) {
                        cartes = jeu.lignes[index1].slice(tab_index);
                        jeu.lignes[index1] = jeu.lignes[index1].slice(0, tab_index);
                    } else {
                        joueur.cartes = [];
                        cartes.push(premiere);
                    }

                    for (let carte of cartes){
                        jeu.lignes[index2].push(carte);
                    }
                } else {
                    console.log("invalide");
                }   
            }
             
            for (let ligne of jeu.lignes){
                let stop = false;
                for (let i = ligne.length-1; i > 0; i--){
                    if (!stop) {
                        if (((ligne[i].valeur + 1) == (ligne[i-1].valeur)) && ((ligne[i].couleur == "rouge" && ligne[i-1].couleur == "noire") || (ligne[i].couleur == "noire" && ligne[i-1].couleur == "rouge"))) {
                            ligne[i-1].cache = false;
                            ligne[i].cache = false;
                        } else {
                            ligne[i-1].cache = true;
                            stop = true;
                        }
                    }
                }
            }
                
            for (let ligne of jeu.lignes){
                if (ligne.length != 0) {
                    ligne[ligne.length-1].cache = false;
                }
            }

            if (jeu.ordreIndex < jeu.joueurs.length-1) {
                jeu.ordreIndex += 1
            } else {
                jeu.ordreIndex = 0
            }
            joueur.selection = [];

            //verifie si gagné
            let count = 0;
            for (let carte of jeu.plateau){
                let length = carte.length;
                if (carte.length != 0) {
                    if (carte[length-1].nom == "roi"){
                    count += 1;
                    }
                }
            }   
            if (count == 4){
                io.emit('terminerJeu', jeu);
                terminerJeu(jeu);
            }
        }
    }); 
    //socket pour récupérer tout les joueurs de la bdd 
    socket.on('returnJoueurs', data => {
        if (utiliseBDD) {
            let requete = "SELECT NomJoueur,AVG(score) AS Score_Moyen, COUNT(Resultat) AS Nombre_De_Victoire, TypeDeJeux FROM joueurs,statistiquejoueur WHERE (user=NomJoueur) AND (Resultat='Victoire') GROUP BY NomJoueur, TypeDeJeux";
            bd.query(requete, (error, results, fields) => {
                socket.emit('getJoueurs', results);
            });
        } else {
            let arr = [];

            for (let joueur of joueurs){
                arr.push({user: joueur.user, score: 0})
            }
            socket.emit('getJoueurs', arr);
        }
    });

    socket.on('unMessage', data => {
        let jeu = retourneJeuDuJoueur(data.user);
        jeu.chat += data.user + ": " + data.msg + '\n';
        io.emit('chat', jeu.chat);
    });

    //socket pour gérer le cas des joueurs qui n'ont pas posé une carte après 30 secondes
    socket.on('distribueCarteAlea', data => {
        let jeu = retourneJeuDuJoueur(data.user)

        for (let joueur of jeu.joueurs){
            if (!joueur.joue){
                let index = Math.floor(Math.random() * (joueur.cartes.length-1));
                let carte = joueur.cartes[index]
                socket.emit('ajouteCarteCacheAleatoirement', {valeur: carte.valeur, user: data.user});
            }
        }
    });
});

function terminerJeu(jeu){
    trierJoueurs(jeu.joueurs)

    let gagant = jeu.joueurs[0]
    let type = "";

    if (jeu.type == "6qp"){
        type = "6QuiPrend"
    }
    
    if (jeu.type == "bataille"){
        type = "Bataille"

        for (let joueur of jeu.joueurs){
           joueur.points = joueur.cartes.length;
        }
    }

    for (let joueur of jeu.joueurs){
        let t = ""
        if (joueur.user == gagant.user) {
            t = "Victoire"
        } else {
            t = "Defaite"
        }

        if (envoieStatBDD){
            ajoutePointsBDD(joueur.user, type, joueur.points, t)
        }
    }

   jeu.terminer = true;
}

function retirerCarte(joueur, valeurCarte){
    let carteJoue = null;
    let nouvelleMain = [];
    for (let carte of joueur.cartes){
        if (carte.valeur != valeurCarte){
            nouvelleMain.push(carte);
        } else {
            carteJoue = carte;
        }
    }
    joueur.main = nouvelleMain;
    return carteJoue;
}

function enleveJoueurDansJeu(jeu, nom){
    let tab = [];
    for (let joueur of jeu.joueurs){
        if (joueur.user != nom){
            tab.push(joueur)
        }
    }
    jeu.joueurs = tab;
    tab = []
    for (let jeu of jeux){
        if (jeu.joueurs.length != 0) {
            tab.push(jeu)
        }
    }
    jeux = tab;
}

function ajouteJoueurDansJeu(jeu, nom){
    let bool = true
    if (jeu.joueurs.length < jeu.maxJoueurs) {
        for (let joueur of jeu.joueurs){
            if (joueur.user == nom){
                bool = false;
            }
        }
        if (bool) {
            jeu.joueurs.push(new Joueur(nom, [], 0, [], false, 100, false));
        }
    }
}

function rangeCarteCroissant(liste){
    for (let i = 0; i < liste.length-1; i++){
        for (let j = i+1; j < liste.length; j++){
            if (liste[i].valeur > liste[j].valeur) {
                let t = liste[i];
                liste[i] = liste[j];
                liste[j] = t;
            }
        }
    }
}

function genererCarteBataille(){
    const nom = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "valet", "reine", "roi", "as"];
    const symboles = ["coeur", "carreau", "trefle", "pique"];
    const deck = [];

    for (let i = 0; i < nom.length; i++){
        for (let symb of symboles){
            deck.push({nom: nom[i], symbole: symb, valeur: i});
        }
    }

    return deck;
}

function genererCarteSolitaire(){
    const nom = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "valet", "reine", "roi", "as"];
    const symboles = ["coeur", "carreau", "trefle", "pique"];
    const deck = [];

    for (let i = 0; i < nom.length; i++){
        for (let symb of symboles){
            let val = i + 2;

            if (nom[i] == "valet"){
                val = 11;
            }
            if (nom[i] == "reine"){
                val = 12;
            }
            if (nom[i] == "roi"){
                val = 13;
            }
            if ((nom[i] == "as")){
                val = 1;
            }
            let couleur = "";

            if (symb == "coeur" || symb == "carreau"){
                couleur = "rouge";
            } else {    
                couleur = "noire";
            } 
            deck.push({nom: nom[i], symbole: symb, valeur: val, cache: true, couleur: couleur});
        }
    }

    return deck;
}
function ajoutJoueurBDD(user, password){
   let requete = "INSERT INTO joueurs(user, password) VALUES('" + user + "', MD5('" + password+ "'))";
   bd.query(requete);
}
function retourneJeuDuJoueur(j){
    for (let jeu of jeux){
        for (let joueur of jeu.joueurs){
            if (joueur.user == j){
                return jeu;
            }
        }
    }
    return null;
}
function retourneJoueurDuJeu(stringJoueur, jeu){
    for (let joueur of jeu.joueurs){
       if (joueur.user == stringJoueur){
        return joueur
       }
    }
    return null;
}
function genererCartes6QuiPrend(){ //genere les cartes du jeu et les met dans un deck
    const Deck = [];
    for(let i = 1; i < 105; i++){
        if(i == 55){
            Deck.push({valeur: i, boeuf: 7});
        } else {
            if((i % 10) == 5) {
                Deck.push({valeur: i, boeuf: 2});
                // Ajoute une carte pour chaque ligne, les cartes sont retirées du deck 
            } else{
                if((i % 10) == 0){
                    Deck.push({valeur: i, boeuf: 3});
                } else{
                    if((i % 11) == 0) {
                        Deck.push({valeur: i, boeuf: 5});
                    } else {
                        Deck.push({valeur: i, boeuf: 1});
                    }
                }
            }
        }
    }
    return Deck;
}
function melangeCartes(cartes){ //Melange le deck 
    for (let j = 0; j < 3; j++){
        for (let i = (cartes.length)-1; i > 0; i--){
            const j = Math.floor(Math.random() * (i+1))
            const temp = cartes[i];
            cartes[i] = cartes[j];
            cartes[j] = temp;
        }
    }
}
function SommeTete(ListeCartes){ // somme des tetes de boeufs d'une liste de cartes -> points 
    let somme=0;
    for(let carte of ListeCartes){
        somme+= carte.boeuf;
    }
    return somme;
}
function DistribueCarte(jeu, carte, quantite){
    let joueurs = jeu.joueurs;

    for (let joueur of joueurs){
        for (let i = 0; i < quantite; i++){
            let car = carte.pop()
            joueur.cartes.push(car);
        }
    }
}
function NombreDeCroissants(ListeDeListeCarte, CarteJoue){ // retourne l'index de toutes listes ou une carte est supérieur au dernière élèment de la liste
    let indexListe = [];
    let index = 0;

    for (let liste of ListeDeListeCarte){
        let c = liste[liste.length-1];
            if (CarteJoue.valeur > c.valeur) {
                indexListe.push(index);
            }
            index += 1;

    }
    return indexListe;
}

function trierJoueurs(ListeDesJoueurs){ // retourne la liste des joueurs triées croissants vis a vis de leur point
    let terminaison;
    do {
        terminaison = false;
        for(var i=0; i < ListeDesJoueurs.length-1; i++){
            if(ListeDesJoueurs[i].points > ListeDesJoueurs[i+1].points) {
                let tmp = ListeDesJoueurs[i];
                ListeDesJoueurs[i] = ListeDesJoueurs[i+1];
                ListeDesJoueurs[i+1] = tmp;
                terminaison = true;
            }
        }
    }	while(terminaison);
}
function ajoutePointsBDD(user, jeu, points, state){

    // La table statistiquejoueur 
    // NbPartie = int AUTO_Incremente, 
    // NomJoueur= VARCHAR , 
    // TypeDeJeux= VARCHAR, Bataille ou 6QuiPrend => Respecter l'ecriture 
    // Score=INT,
    // Resultat=VARCHAR; Victoire ou Defaite => Important de l ecrire comme ça dans la base de données

    let requete = "INSERT INTO statistiquejoueur (NomJoueur,TypeDeJeux,Score,Resultat) VALUES('" + user +"','" + jeu + "'," + points +",'" + state +"');"; // exemple d'insertion
    
    bd.query(requete);
   
    console.log("info ajouter")
}

function inverseListe(liste){
    let retu = [];

    while (liste.length != 0){
        retu.push(liste.pop())
    }

    return retu;
}

/*######################################################################Zone test###########################################################################*/


// fonction qui met en premier les elements a ajouter puis le reste de la liste, on utilisera quand un joueur gagne une manche de bataille
function CustomPush(liste, listeSnd){
    let ListeRetour = [];
    
    for (let carte of listeSnd){
        ListeRetour.push(carte);
    }   
    for (let carte of liste){
        ListeRetour.push(carte);
    }

    return ListeRetour;
}

//fonction qui parcours la liste des cartes jouées et donne la valeur la plus élevé 
function CarteValeurMaxListe(liste){ // liste de liste de carte et du joueur 
    let max = 0;
    for (let carte of liste){
        if (carte.valeur > max){
            max = carte.valeur
        }
    }
    return max;
}

//fonction qui retourne le nombre de personnes avec la valeur max, utile si durant la bataille, plusieurs personnes ont la valeur la max
function NbCarteValeurMaxListe(liste, max){
    let compteur = 0;
    for (let carte of liste){
        if (carte.valeur == max){
            compteur += 1;
        }
    }
    return compteur;
}

//fonction qui retourne la liste des joueurs avec la valeur max, utiliser pour si il y a bataille, on pourrait faire un appel recursif a la fonction bataille avec que ces joueurs
function ListeJoueurValMax(joueurs, max){
    let NewListeJoueur = [];
    
    for (let joueur of joueurs){
        let ajoute = false;

        for (let carte of joueur.cartes){
            if (carte.valeur == max) {
                ajoute = true;
            }
        }

        if (ajoute) {
            NewListeJoueur.push(joueur.user);
        }
    }
    return NewListeJoueur;
}

function bataille2(joueurs, joueursJeu, carteRecup){
    let cartePioche = [];
    let joueurs_avec_max = [];
    let joueurs_avec_min = [];
    let objetsJoueursBataille = []


    // converti liste de noms des joueurs en object joueurs
    for (let j of joueursJeu){
        if (joueurs.includes(j.user)){
            objetsJoueursBataille.push(j)
        }
    }

    // enleve une carte de la main de chaque joueurs et on les mets dans cartePioche
    for (let joueur of objetsJoueursBataille) {
        cartePioche.push(joueur.cartes.pop())
    }

    // on trouve la carte avec la valeur la plus haut
    let max = 0;
    for (let carte of cartePioche){
        if (carte.valeur > max){
            max = carte.valeur
        }
    }
    //on trie les joueurs qui ont est n'ont pas la cartes max
    for (let carte of cartePioche){
        if (carte.valeur == max) {
            joueurs_avec_max.push(carte.prop);
        } else {
            joueurs_avec_min.push(carte.prop)
        }
    }

    //si le nombre de personne avec la carte max est egale à 1 alors il y a un gagnant
    //sinon on fait une recursion tant qu'il y a un gagnant
    if ((joueurs_avec_max.length) == 1) {
        let gagnant = joueurs_avec_max[0]

        for (let carte of cartePioche){
            carteRecup.push(carte);
        }

        for (let joueur of objetsJoueursBataille) {
            carteRecup.push(joueur.cartes.pop())
        }

        console.log(gagnant + " gagne")
        return [gagnant, carteRecup]
    } else {
        let nextbataille = []

        for (let joueur of joueurs_avec_min){
            nextbataille.push(joueur)
        }

        nextbataille.push(bataille2(joueurs_avec_max, joueursJeu, carteRecup))

        return bataille2(nextbataille, joueursJeu, carteRecup)[0];
    }
}
