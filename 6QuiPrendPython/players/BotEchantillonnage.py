from players.player import Player
from game.card import Card
from game.nimmtGame import NimmtGame
from random import *    
import copy

class BotEchantillonnage(Player):
    def info(self, message):
        """
        Affiche un message à l'attention du joueur.
        
        :param message: Le message à afficher.
        """
        pass



    def getLineToRemove(self, game):
        min=NimmtGame.total_cows(game.table[0])
        ligneMin=0
        for line in range(1,len(game.table)):
            if NimmtGame.total_cows(game.table[line])<min:
                min=NimmtGame.total_cows(game.table[line])
                ligneMin=line

        return ligneMin+1
        

    def getCardToPlay(self):  
        pass
        


    def player_turn(self, game):
        """
        Gère le tour de jeu d'un joueur.

        :param game : le jeu en cours
        """
        score_initial =self.score #permet de garder le score originale avant la simulation
        nombre_simulation=5
        liste_couple_carte=[]

        for carte in self.hand:

            nbCartes=len(self.hand)
            self.score =score_initial #YYYYYYYEEEEEEEEEEEESSSSSSSSS
            
            for _ in range(nombre_simulation):
                copie_game= copy.deepcopy(game) # Selon Sylvain pour ne pas détruire le jeu actuel
                total_vaches = 0

                for j in range(nbCartes):

                    E=[] 
                    cards = list(map(lambda c:Card(c),list(range(1, 105))))
                    resultat = []
                    for e in cards:
                        if (e not in copie_game.alreadyPlayedCards) and (e not in self.hand):
                            resultat.append(e)
                        

                    if j==0 :
                        Nbappend=len(copie_game.players)-1
                    else:
                        Nbappend=len(copie_game.players)

                    # print(resultat)
                    # print(len(resultat))
                    for i in range(Nbappend):
                        numero=randint(0,len(resultat)-1) # si problème 
                        E.append(resultat[numero])
                        resultat.remove(resultat[numero])

                    #simulation:
                    for cartesPossibles in E:
                        plays = [(self,cartesPossibles) for player in copie_game.players]
                    if j==0:
                        plays.append((self,carte))

                    copie_game.update_table(plays)

                    
                #Recuperation du nom
                for i in range(len(copie_game.players)):
                    if copie_game.players[i].name == self.name:
                        total_vaches += copie_game.players[i].score
                
                # print(carte,total_vaches)

            #calcul moyenne et insertion liste de liste 
            moyenne_vache= total_vaches / nombre_simulation
            # print(carte,moyenne_vache)
            liste_couple_carte.append([carte,moyenne_vache]) 

        #################################Minimun d'une liste de liste############################

        carte_possible = liste_couple_carte[0][0]
        tete_vache_carte = liste_couple_carte[0][1]

        for i in range(len(liste_couple_carte)):
            if liste_couple_carte[i][1] < tete_vache_carte:
                carte_possible = liste_couple_carte[i][0]
                tete_vache_carte = liste_couple_carte[i][1]

        self.score =score_initial
        return carte_possible 

    