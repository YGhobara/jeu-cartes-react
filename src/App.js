
import React, { useState, useEffect } from 'react';

import './App.css';
import io from 'socket.io-client'

const socket = io('http://localhost:8000');

/*############################################################### PAGE WAIT ######################################################################*/

function PagePending(){
    const [quitte, setQuitte] = useState(false);
    const [string, setString] = useState("");
    const [showButton, setShowButton] = useState(true);
    const [start, setStart] = useState(false);
    const [host, setHost] = useState("");
    const [botMode, setBotMode] = useState(false)
    const [strat, setStrat] = useState("random")
    
    let us = sessionStorage.getItem("login")

    socket.emit("returnJoueurJeu", {user: us});

    const startFunc = () => {
      socket.emit('commenceJeu', {user: us});
    }

    socket.on('returnJoueurJeu2', data => {
        setString(data.joueurs.length + " / " + data.maxJoueurs);    
        setShowButton((data.host === us));
        setHost(data.host);
        setBotMode(data.type === "6qp" && (data.host === us))
    });

    const quitteFunc = () => {
      let us = sessionStorage.getItem("login")
      socket.emit('quitteJeu', {user: us});
      setQuitte(true)
    }

    socket.on('start', data => {
      if (host == data.host){
        setStart(true);
      }
    });

    let str = []

    if (botMode){
      str.push(<label>Bot </label>)
      str.push(
        <select onChange = {(t) => setStrat(t.target.value)}>
        <option value="random">Random</option>
        <option value="min">Min</option>
        <option value="max">Max</option>
      </select>
      )
      str.push(<button className='listPlayersButton' onClick={() => socket.emit('ajouteBot', {user: us, strat: strat})}> Ajoute Bot</button>)
    } 

    if (start) {
      return <PageJeu/>
    }
 
    if (quitte){
      return <Connecter/>
    }
  
    let buttonTable = [];
    
    if (showButton){
      buttonTable.push(<button key="1" className='listPlayersButton' onClick={() => startFunc()}>Démarrer le jeu</button>);
    }
  
    return (
      <div align="center">
        <h4>{string}</h4>

        {str}
        <br></br>
        <br></br>
        {buttonTable}
        <button className='listPlayersButton' onClick={() => quitteFunc()}>Quitter le jeu</button>
      </div>
    );
}

/*############################################################### PAGE Jeu ######################################################################*/

function PageJeu(){
    const [quitte, setQuitte] = useState(false);
    const [jeu, setJeu] = useState("");
    const [cartesJoueur, setCartesJoueur] = useState([]);
    const [Timer, setTimer] = useState(30);
    
    let us = sessionStorage.getItem("login")

    const quitteFunc = () => {
      socket.emit('quitteJeu', {user: us})
      setQuitte(true);
      
    }
    let data = [];

    socket.emit("returnJoueurJeu", {user: us});
  
    socket.on('returnJoueurJeu2', data => {
      setJeu(data.type);
      for (let joueur of data.joueurs){
        if (joueur.user === us){
          setCartesJoueur(joueur.cartes);
        }
      }
    });
    
    socket.on('resetLeTimer', data => {
      setTimer(30);
    });

    // useEffect(() => {
    //   if (Timer === 0) {
    //     clearInterval(intervalRef.current);
    //     socket.emit('distribueCarteAlea', {user: us});
    //   }
    // }, [Timer]);
  
    // const intervalRef = useRef();
  
    // useEffect(() => {
    //   intervalRef.current = setInterval(() => {
    //     if (Timer > 0) {
    //       setTimer(Timer - 1);
    //     }
    //   }, 1000);
  
    //   return () => clearInterval(intervalRef.current);
    // }, [Timer]);
  
    // const formatTimer = () => {
    //   const tens = Math.floor((Timer % 100) / 10);
    //   const units = Timer % 10;
    //   return `${tens}${units}`;
    // };

    if (jeu === "bataille") {
      data.push(<Interface_Bataille key="bataille" />);
    }                                                
    if (jeu === "6qp") {
      data.push(<Interface_6QP key="6qp" />);
    }
    if (jeu === "solitaire"){
      data.push(<Interface_Solitaire key="solitaire" />);
    }

    if (quitte){
      return <Connecter/>
    }

    let main = [];
    let key_index = 0;

    if (jeu === "6qp"){
        for (let carte of cartesJoueur){
          let val = "cartes_6QP/" + carte.valeur;
          main.push(<Carte nom={val} jeu="6qp" key={key_index} click="1"/>);
          key_index += 1;
        }
    }

    return (
      <div>
        <div align="center">
          {/* <h1>Time: {formatTimer()}</h1> */}
          {data}
          <br></br>
          <br></br>
          <br></br>
          {main}

          <Chat/>
          <button className="abandonButton" onClick={() => quitteFunc()}>Abandonner</button>
        </div>
      </div>
    );
  }

  /*############################################################### interface solitaire ######################################################################*/
  function Interface_Solitaire(){
    let us = sessionStorage.getItem("login");

    const [ligneCartes, setLigneCartes] = useState([]);
    const [plateauCartes, setPlateauCartes] = useState([]);
    const [demandeCarte, setDemandeCarte] = useState("");
    const [etape, setEtape] = useState(0);
    const [ordre, setOrdre] = useState("");

    socket.emit('updateClientRequest', {user: us});

    socket.on('updateClientReceived', data => {
      setLigneCartes(data.lignes);
      setPlateauCartes(data.plateau);
      setEtape(data.manche);

      let joueurs = data.joueurs;
        for (let joueur of joueurs){
          if (joueur.user == us) {
            setDemandeCarte(joueur.cartes[0]);
          }
        }
        let index = data.ordreIndex
        setOrdre(data.ordre[index]);
    }); 

    const piocheCarte = () => {
      if (ordre == us){
        socket.emit("demande_carte_solitaire", {user: us});
      }
    }

    let lignes = [[], [], [], [], [], [], []];
    let plateau = [[], [], [], []];
    
    if (plateauCartes.length !== 0){
      for (let i = 0; i < plateauCartes.length; i++){

        if (plateauCartes[i].length === 0){
          plateau.push(<Carte nom="" cache="1" objet={i} jeu="solitaire" click="1"/>)
        } else {
          let length = plateauCartes[i].length
          let carte = plateauCartes[i][length-1]

          let val = "cartes_bataille/" + carte.nom + "_" + carte.symbole;
          plateau.push(<Carte nom={val} cache="0" objet={i} jeu="solitaire" click="1"/>)
        }
      }
    }

    if (ligneCartes.length !== 0) {
      for (let i = 0; i < lignes.length; i++){
        let index = 0;

        if (ligneCartes[i].length !== 0) {
          for (let carte of ligneCartes[i]){
            let val = "cartes_bataille/" + carte.nom + "_" + carte.symbole;
            let c = "1";
            let click = "0"
  
            let cardStyle = {
                position: 'relative',
                zIndex: index,
                bottom: index === 0 ? '0px' : 50 * index + 'px'
            };
  
            if (!carte.cache){
              c = "0";
              click = "1";
            }
  
            lignes[i].push(<div style={cardStyle}><Carte nom={val} objet={carte} cache={c} jeu="solitaire" click={click}/></div>);
            index += 1;
          }
        } else {
          lignes[i].push(<div><Carte nom="" objet={"vide"} index={i} cache="1" jeu="solitaire" click="1"/></div>);
        }
      }
    }
    
    let carte_pioche = [];
    if (demandeCarte !== undefined){
      let val = "cartes_bataille/" + demandeCarte.nom + "_" + demandeCarte.symbole;
      carte_pioche.push(<Carte nom={val} objet={demandeCarte} cache="0" jeu="solitaire" click="1"/>);
    }

    let texte_ordre = "";
    if (ordre == us){
      texte_ordre = "A votre tour";
    } else {
      texte_ordre = ordre + " doit jouer";
    }

    return (
      <div>
        <h1>Movement: {etape}</h1>
        <h1>{texte_ordre}</h1>
        <div style={{display:"flex", flexDirection: "row", justifyContent:"center"}}>
          <button onClick={piocheCarte}>Pioche Carte</button>
          {carte_pioche}
        </div>

        {plateau}
         <div style={{display:"flex", flexDirection: "row", justifyContent:"center"}}>
          {lignes.map((ligne, index) => (
              <div key={index} style={{padding: "5px"}}>
                  {ligne}
              </div>
          ))}
        </div>
      </div>
    );
  }

/*############################################################### composants jeu bataille ######################################################################*/
  function Bataille_Player(param){
    let us = sessionStorage.getItem("login")

    const piocheCarte = () => {
      if (param.param.nom == us) {
        socket.emit('piocheCarte', {user: us});
      }
    }

    return (
      <div>
        <h2>{param.param.nom} : {param.param.total}</h2>
        <img style={{width: 70 + "px", padding: "10px"}} src={process.env.PUBLIC_URL + "/cartes/cartes_bataille/back0.svg"} onClick = {() => piocheCarte()} alt="carte"/>
      </div>
    );
  }

/*############################################################### composants jeu bataille ######################################################################*/
function Interface_Bataille(){
  let us = sessionStorage.getItem("login")
  const [plateau, setPlateau] = useState([])
  const [cache, setCache] = useState(false)
  const [joueurs, setJoueurs] = useState([]);
  const [manche, setManche] = useState(0);

  socket.emit('updateClientRequest', {user: us});

  socket.on('updateClientReceived', data => {
    setPlateau(data.plateau);
    setCache(data.cacheState);
    setJoueurs(data.joueurs);
    setManche(data.manche + " / " + data.maxManche);
  }); 

  let plateauBataille = [];
  let joueursTable = [];

  for (let joueur of joueurs){
    joueursTable.push(<Bataille_Player param={{nom: joueur.user, total: joueur.cartes.length}}/>)
  }

  for (let carte of plateau){
    let val = "";
    if (cache) {  
      val = "cartes_bataille/back0";
    } else {
      val = "cartes_bataille/" + carte.nom + "_" + carte.symbole;
    }
    plateauBataille.push(<img style={{width: "70px"}} src={process.env.PUBLIC_URL + "/cartes/" + val + ".svg"} alt="carte"/>);
  }
 
  return (
    <div>
      <br/>
      <h1>Manche: {manche}</h1>
      <br/>
      {plateauBataille}
      <br/>
      <br/>
      <br/>
      <div style={{display: "flex", justifyContent: "center" }}>
        <div style={{display: "flex" }}>
          {joueursTable}
        </div>
      </div>
    </div>
  );
}

/*############################################################### composants jeu 6QP ######################################################################*/
function Interface_6QP(){
    const [lignes, setLignes] = useState([]);
    const [plateau, setPlateau] = useState([]);
    const [points, setPoints] = useState(0);
    const [manche, setManche] = useState(1);
    const [cache, setCache] = useState(true);
    const [joueurChoisi, setJoueurChoisi] = useState("");
    const [aJouer, setAJouer] = useState("");
    
    let us = sessionStorage.getItem("login")

    socket.emit('updateClientRequest', {user: us});

    socket.emit('botJoue', {user: us});

    socket.on('updateClientReceived', data => {
      setLignes(data.lignes);
      setCache(data.cacheState);
      setPlateau(data.plateau)  
      if (data.joueurs[data.ordreIndex] !== undefined) {
        setJoueurChoisi(data.joueurs[data.ordreIndex].user);
      }

      if (!data.cacheState){
        if (us == data.ordre[data.ordreIndex]) {
          setAJouer("Choisissez une ligne");
        } else {
          setAJouer(data.ordre[data.ordreIndex] + " doit jouer");
        }
      } else {
        setAJouer("Placer Une Carte");
      }
      
      for (let joueur of data.joueurs){
          if (joueur.user == us) {
              setPoints(joueur.points)
          } 
      }
      // setManche(data.manche);
      setManche(data.manche + " / " + data.maxManche);
    }); 

    socket.on('placementCartes2', data => { 
      socket.emit('placementCartes', {user: us})
    });

    let ligneData1 = [];
    let ligneData2 = [];
    let ligneData3 = [];
    let ligneData4 = [];
    let plateauLigne = [];

    if (lignes.length !== 0) {
      let key_index = 0;

      for (let carte of lignes[0]){
          let val = "cartes_6QP/" + carte.valeur;
          ligneData1.push(<Carte nom={val} index={0} jeu="6qp" click="1" doitJouer = {joueurChoisi} key={"ligneData1_" + key_index}/>);
          key_index += 1;
      }
      for (let carte of lignes[1]){
          let val = "cartes_6QP/" + carte.valeur;
          ligneData2.push(<Carte nom={val} index={1} jeu="6qp" click="1" doitJouer = {joueurChoisi} key={"ligneData2_" + key_index}/>);
          key_index += 1;
      }
      for (let carte of lignes[2]){
          let val = "cartes_6QP/" + carte.valeur;
          ligneData3.push(<Carte nom={val} index={2} jeu="6qp" click="1" doitJouer = {joueurChoisi} key={"ligneData3_" + key_index}/>);
          key_index += 1;
      }
      for (let carte of lignes[3]){
          let val = "cartes_6QP/" + carte.valeur;
          ligneData4.push(<Carte nom={val} index={3} jeu="6qp" click="1" doitJouer = {joueurChoisi} key={"ligneData4_" + key_index}/>);
          key_index += 1;
      }
  
      for (let carte of plateau){
          let cache_p = "0";
          let val = "cartes_6QP/" + carte.valeur;

          if (cache) {
              cache_p = "1"
          }

          plateauLigne.push(<Carte nom={val} index={10} jeu="6qp" cache={cache} key={"plateauLigne_" + key_index}/>);
          key_index += 1;
      }
  }
  
    return (
      <div className="board">
          <h1>Points: {points} / Manche: {manche}</h1>
          <h1>{aJouer}</h1>
          <h1></h1>
          <div align="center" className="QP">
            {ligneData1}
            <br></br>
            {ligneData2}
            <br></br>
            {ligneData3}
            <br></br>
            {ligneData4}
          </div>

          <div>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            {plateauLigne}
          </div>
      </div>
    );
}

/*############################################################### carte ######################################################################*/
function Carte(param){
  let us = sessionStorage.getItem("login");

  console.log(param.doitJouer)

  const carteClique = (valeur) => {
    if (param.click == "1") {

      if (param.jeu == "6qp") {
        if (param.index == undefined){
          socket.emit('ajouteCarteCache', {valeur: valeur, user: us});
        } else {
          socket.emit('ligneChoisieParJoueur', {user: us, index: param.index});
        }
      }
  
      if (param.jeu == "solitaire"){
        socket.emit('selection_carte_solitaire', {user: us, objet: param.objet, index: param.index});
      }
    }
  }

  let val = "";
  if (param.cache == "1") {
    val = "cartes_bataille/back0";
  } else {
    val = param.nom;
  }
  return (
      <img style={{height: "100px"}} 
      src={process.env.PUBLIC_URL + "/cartes/" + val + ".svg"} 
      alt="carte" 
      onClick = {() => carteClique((param.nom).slice(11))}/>
  );
}
/*############################################################### chat ######################################################################*/

function Chat(){
    const [message, setMessage] = useState("");
    const [chatBox, setChatBox] = useState("");
  
    const envoiMessage = () => {
      let us = sessionStorage.getItem("login");
      socket.emit('unMessage', {msg: message, user: us});
      setMessage("");
    }
  
    socket.on('chat', data => {
      setChatBox(data);
    });
  
    return (
      <div className="chat-container">
        <div id="messagerie" className="chat">
          <textarea id="chatBox" cols="35" rows="30" value={chatBox} readOnly></textarea>
          <br/>
          <input type="text" id="message" size="21" value = {message} onChange={(e) => setMessage(e.target.value)}/><button onClick={envoiMessage}>Envoyer</button>
        </div>
      </div>
    ); 
  }
/*############################################################### PAGE liste partie ######################################################################*/

function PageListeParties(){
    const [listeJeux, setListeJeux] = useState([]);
    
    socket.emit("retourneJeux", {});
    
    socket.on('retourneJeux2', data => {
      setListeJeux(data);
    })  
  
    var listeParties = []; 
  
    const rejoindre = (param) => {
        let us = sessionStorage.getItem("login");
        socket.emit('rejoindreJeu', {host: param, user: us});
    } 
  
    listeJeux.forEach((partie, index) => {
        let string = "";

        switch(partie.type){
          case "bataille":
            string = "Bataille";
            break;

          case "6qp":
            string = "6 Qui Prend"
            break;

          case "solitaire":
            string = "Solitaire"
            break;

          default: 
            string = "jeu"
            break;
        }

        if (partie.state === "pending"){
          listeParties.push(<tr key={index}><td>{partie.host}</td><td>{string}</td><td>{partie.joueurs.length}/{partie.maxJoueurs}</td><td>{partie.maxManche}</td><td><button onClick = {() => rejoindre(partie.host) }>Rejoindre le jeu</button></td></tr>);
        }
    });
  
    return (
      <div align="center">
          <table>
              <tbody>
                  <tr>
                  <th>Hote</th>
                  <th>Jeu</th>
                  <th>Joueurs</th>
                  <th>Manche</th>
                  <th>Rejoindre</th>
                  </tr>
                  {listeParties}
              </tbody>
          </table>
      </div>
    );
}

/*############################################################### PAGE creation de jeu/partie ######################################################################*/

function CreateGamePage(){
    const [back, setBack] = useState(false);
    const [goWait, setGoWait] = useState(false);
    const [nbMax, setMax] = useState(1);
    const [nbManche, setManche] = useState(5);
    const [jeu, setJeu] = useState("bataille");

    if (back) {
      return <Connecter/>
    } 
    if (goWait) {
      return <PagePending/>
    } 
  
    const Create = () => {
      socket.emit('ajoutJeu', {max: nbMax, host: sessionStorage.getItem("login"), type: jeu, manche: nbManche});
      setGoWait(true)
    }

    return (
      <div className="premier-page">
        <h1>Créer un jeu: </h1>
        <br/>
  
        <label>Jeu: </label>
        <select id="jeu" onChange = {(t) => setJeu(t.target.value) }>
          <option value="bataille">Bataille</option>
          <option value="6qp">6 Qui Prend</option>
          <option value="solitaire">Multitaire</option>
        </select>
  
        <br/>
        <br/>
        
        <label>Joueurs: </label>
        <input type="number" value={nbMax} min = "1" max = "4" onChange = {(t) => setMax(t.target.value)}></input>
        <label>Manche: </label>
        <input type="number" value={nbManche} min = "5" max = "50" onChange = {(t) => setManche(t.target.value)}></input>
        <br/>
    
        <button className='listPlayersButton' onClick={Create}> Créer Jeu </button>
        <button className='listPlayersButton' onClick = {() => setBack(true)}>Retour</button>
      </div>
    );
  }

/*############################################################### PAGE Connecter ######################################################################*/   

function Connecter(){
    const [back, setBack] = useState(false);
    const [creeJeuPage, setCreeJeuPage] = useState(false);
    const [attendre, setAttendre] = useState(false);
    const [fin, setFin] = useState(false);
    const[jeu, setJeu] = useState([]);

    const deconnexion = () => {
      sessionStorage.clear();
      setBack(true);
    }

    socket.on('rejoindreJeu2', data => {
      setAttendre(data);
    });
    
    socket.on('terminerJeu', data => {
      setFin(true)
      setJeu(data);
    });

    socket.on('retour2', data => {
      setFin(false)
    });

    let us = sessionStorage.getItem("login");

    if (fin){
      let joueurs = jeu.joueurs
      for (let joueur of joueurs){
        if (joueur.user == us){
          return <PageFinJeu param={{jeu: jeu}}/>
        }
      }
    }
    if (attendre){
      return <PagePending/>
    }
    if (back){
      return <Home/>
    }
    if (creeJeuPage){
      return <CreateGamePage/>
    }
  
    return (
      <div align="center" className="premier-page-aprés-connecté">
        <h1>Connecté!  <label>{sessionStorage.getItem("login")}</label></h1>
        <button className='buttonLog' onClick = {() => setCreeJeuPage(true)}>Créer Jeu</button>
        <br/> 
        <br/> 
        <PageListeParties/>
        <br/> 
        <button className='listPlayersButton' onClick = {deconnexion}>Déconnexion</button>
      </div>
    );
  }

/*############################################################### Connexion  ######################################################################*/

function Connexion() {
    const [back, setBack] = useState(false);
    const [userText, setUserText] = useState("");
    const [erreur, setErreur] = useState("");
    const [passwordText, setPasswordText] = useState("");
    const [login, setLogin] = useState(false);

    const loginFunc = () => {
      socket.emit("demandeConnexion", {user: userText, pass: passwordText});
      socket.on('loginOUT', data => {
        
        if (data) {
          sessionStorage.setItem("login", userText);
          setLogin(true)
        } else {
          setErreur("Utilisateur Introuvable");
        }
      });
    }
  
    if (login){
      return <Connecter/>
    }
  
    if (back){
      return <Home/>
    }
  
    return (
      <div className="Connexion">
        <h1>Connexion</h1>
        <input type="text" placeholder="Nom utilisateur" onChange = {(t) => setUserText(t.target.value)}></input>
        <br/>
        <input type="password" placeholder="Mot de passe" onChange = {(t) => setPasswordText(t.target.value)}></input>
        <br/>
        <button className="conSeConnecter" onClick = {loginFunc}>Connexion</button>
        <button className="conRetour" onClick = {() => setBack(true)}>Retour</button>

        <h1 className='erreur'>{erreur}</h1>
      </div>
    );
  }
  
/*############################################################### PAGE Principale ######################################################################*/

function Home() {
    const [signupPage, setSignupPage] = useState(false);
    const [joueursPage, setjoueursPage] = useState(false);
    const [ConnexionPage, setConnexionPage] = useState(false);
    let user = sessionStorage.getItem("login");

    if (signupPage) {
      return <Signup/>
    }
    if (joueursPage) {
      return <Joueurs/>
    }    
    if (user !== null){
      return <Connecter/>
    }
    if (ConnexionPage) {
      return <Connexion/>
    }
  
    socket.emit('quitteJeu', {user: user})

    return (
      <div className="premier-page">
        <h1>Jeux De CartesA AAA A A </h1>
        <button className='buttonLog' onClick = {() => setConnexionPage(true)}>Connexion</button>
        <br/> 
        <br/> 
        <button className='buttonInsc' onClick = {() => setSignupPage(true)}>Inscription</button>
        <br/> 
        <button className='listPlayersButton' onClick = {() => setjoueursPage(true)}>Liste des joueurs</button>
      </div>
    );
  }

/*############################################################### PAGE de la liste des joueurs ######################################################################*/

function Joueurs() {
  const [back, setBack] = useState(false);
  const [allusers, setAlluser] = useState([]);

  if (back){
    return <Home/>
  }
  
  socket.emit('returnJoueurs', {});

  socket.on('getJoueurs', data => {
    setAlluser(data);
  });

  let dataTable = [];

  allusers.forEach((joueur, index) => {
    dataTable.push(<tr key={index}><td>{joueur.NomJoueur}</td><td>{joueur.Score_Moyen}</td><td>{joueur.Nombre_De_Victoire}</td><td>{joueur.TypeDeJeux}</td></tr>);
  });

  return (
    <div className="listPlayers">
        <table className="scrollable-list" >
            <tbody>
                <tr>
                <th>Joueurs</th>
                <th>Score Moyen</th>
                <th>Nombre de victoires</th>
                <th>Type de Jeu</th>
                </tr>

                {dataTable}
            </tbody>
        </table>
        <button className="playerRetour" onClick = {() => setBack(true)}>Retour</button>
    </div>
  );
}

/*############################################################### PAGE Inscription ######################################################################*/
function Signup() {
    const [back, setBack] = useState(false);
    const [userText, setUserText] = useState("");
    const [passwordText, setPasswordText] = useState("");
   
    const submitFunction = () => {
      let userCharacterMin = 1;
      let passCharacterMin = 1;
    
      if (userText !== "" && passwordText !== "" && userText.length >= userCharacterMin && passwordText.length >= passCharacterMin){
        socket.emit('signup', {user: userText, pass: passwordText});
        setUserText("");
        setPasswordText("");
        setBack(true)
      }
    }
  
    if (back){
      return <Home/>
    }
  
    return (
      <div className="inscription">
      <h2>Inscription</h2>
      <input type="text" placeholder="Nom utilisateur" onChange={(t) => setUserText(t.target.value)}></input>
      <br/>
      <input type="password" placeholder="Mot de passe" onChange={(t) => setPasswordText(t.target.value)}></input>
      <br/>
      <button className="sinscrire"onClick = {submitFunction}>S'inscrire</button>
      <button className="inscRetour" onClick = {() => setBack(true)}>Retour</button>
    </div>
    );
  }

  /*############################################################### APP ######################################################################*/

function App() {
    return <Home/>;
}

/*############################################################### PAGE Fin Score ######################################################################*/

function PageFinJeu(param){
  const [listeJoueurs, setListeJoueurs] = useState([]);

  let us = sessionStorage.getItem("login")
  let scoreboardHTML = [];
  let string = "";

  const retour = () => {
    socket.emit('retour', us);
  }

  let joueurs = param.param.jeu.joueurs;
  let index = 0;

  for (let joueur of joueurs) {
    if (param.param.jeu.type == "6qp") {
      if (index == 0){
          scoreboardHTML.push(<tr key={index}><td><h2>Vainqueur:<b>{joueur.user}</b></h2></td><td>{joueur.points}</td></tr>)
      } else {
          scoreboardHTML.push(<tr key={index}><td>{joueur.user}</td><td>{joueur.points}</td></tr>);
      }
    }

    if (param.param.jeu.type == "bataille") {
      if (index == 0){
          scoreboardHTML.push(<tr key={index}><td><h2>Vainqueur:<b>{joueur.user}</b></h2></td><td>{joueur.cartes.length}</td></tr>)
      } else {
          scoreboardHTML.push(<tr key={index}><td>{joueur.user}</td><
            td>{joueur.cartes.length}</td></tr>);
      }
    } 

    index += 1;
  }
  
  if (param.param.jeu.type == "6qp") {
    string = "Points"
  }
  if (param.param.jeu.type == "bataille") {
    string = "Cartes"
  } 

  return (
      <div className="page-score">
          <div align="center">
            <h1>Scoreboard: </h1>

            <table className="scrollable-list">
              <tr key="X"><th>Nom</th><th>{string}</th></tr>
              {scoreboardHTML}
            </table>


            <button className="inscRetour" onClick = {() => retour()}>Retour</button>
          </div>
      </div>
  );
}


export default App;