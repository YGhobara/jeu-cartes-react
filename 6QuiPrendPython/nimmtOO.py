from players.humanPlayer import HumanPlayer
from players.BotAleatoire import BotAleatoire
from players.BotMax import BotMax
from players.BotMin import BotMin
from players.BotPair import BotPair
from players.BotImpair import BotImpair
from players.BotEchantillonnage import BotEchantillonnage
from players.BotMinMax import BotMinMax
from players.BotSmart import BotSmart

from game.nimmtGame import NimmtGame     

import matplotlib.pyplot as plt
import numpy as np

bot = {
    "random": 0,
    "min": 0,
    "max": 0,
    "pair": 0,
    "impair": 0,
    "echant" : 0,
    "minmax" : 0,
    "smart" : 0
}

bot_jeu = ["min", "pair"]
partie = 50

def plot_graph():
    x_positions = []

    for i in range(len(bot_jeu)):
        x_positions.append(i)

    for i in range(len(bot_jeu)):
        name = bot_jeu[i]
        plt.scatter(x_positions[i], bot[name], color='blue', label=name)

    plt.xlabel('Strategie')
    plt.ylabel('Values')
    plt.title('Bot Jeu')
    plt.xticks(x_positions, bot_jeu)
    plt.show()

def interactiveRun():
    while True:
        try:
            players = []

            for bot_name in bot_jeu:
                if bot_name == "random":
                    players.append(BotAleatoire(bot_name))
                if bot_name == "max":
                    players.append(BotMax(bot_name))
                if bot_name == "min":
                    players.append(BotMin(bot_name))
                if bot_name == "pair":
                    players.append(BotPair(bot_name))
                if bot_name == "impair":
                    players.append(BotImpair(bot_name))
                if bot_name == "echant":
                    players.append(BotEchantillonnage(bot_name))
                if bot_name == "minmax":
                    players.append(BotMinMax(bot_name))
                if bot_name == "smart":
                    players.append(BotSmart(bot_name))

            game = NimmtGame(players)
            scores, winners = game.play()

            s = " ".join([player.name for player in winners])
            
            return s
        except ValueError:
            print("")

if __name__ == "__main__":
    for _ in range(partie):
        p = interactiveRun()
        if p in bot:
            bot[p] += 1
    
    for i in bot_jeu:
        print(i + " ==== " + str(bot[i]))

    plot_graph()