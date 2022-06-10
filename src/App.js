import { useEffect, useState } from 'react'; //use the useEffect hook
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json'

// SystemProgram is a reference to the Solama runtime
const { SystemProgram, Keypair } = web3;

// replace this let baseAccount = Keypair.generate(); with
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)


//Get our program's id from the IDL file
const programID = new PublicKey(idl.metadata.address);

//Set our network to devnet
const network = clusterApiUrl('devnet');

//Control how we want to acknowledge when a transaction is 'done'
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = 'UsuaoSilver';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
  'https://media.giphy.com/media/CDTUqFaYWBssS929Ou/giphy.gif',
  'https://media.giphy.com/media/s1mp45mteGisBagZ4G/giphy.gif',
  'https://media.giphy.com/media/lBs73ZcodnfDWAGeEw/giphy.gif',
  'https://media.giphy.com/media/nIoUgc3KW2BF5rxVj2/giphy.gif',
  'https://media.giphy.com/media/dQDSfp0Ni3q31gjQJF/giphy.gif',
  'https://media.giphy.com/media/ho0xXatV7b3Fo1ZRXN/giphy.gif'
]

const App = () => {
  //State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  /**
   * This func holds the Logic for decising if a Phantom Wallet is connected or not - the ACTIONS
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) { 
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

          /**
           * The solana obj gives us a func that will allow us to connect directly with the user's wallet!
           */
          const response = await solana.connect({ onlyIfTrusted: true});
          console.log(
            'Connected with the Public Key: ', response.publicKey.toString()
          );

          /**
           * Set the user's publicKey in state to be used later
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a PhantomWallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Define this method so our code doesnt break. Will write the logic next
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key: ', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!');
      return
    } 
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to the program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  //set value of input box to inputValue
  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  }

  //Set up a Solana Provider for the web app
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment,);
    return provider;
  }

  // Call startStuffOff to initialize program
  const createdGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      console.log({ baseAccount })
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  /**
   * We want to render this UI when the user hasnt connected their wallet to our app yet
   */
  const renderNotConnectedContainer = () => (
    <button className="cta-button connect-wallet-button" onClick={connectWallet}>Connect to Wallet</button>
  );

  const renderConnectedContainer = () => {
    //if we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit_gif-button" onClick={createdGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    }
    // Otherwise, acocunt exists. Users can submit GIFs
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >  
            <input 
              type="text" 
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  /**
   * When our component first mounts, let's check to see if we have a connected Phantom Wallet
   */
  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account);
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifs: ", error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress]);
  
  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your satisfaction GIF collection in the metaverse ✨
          </p>
          <div className={walletAddress ? 'authed-container' : 'container'}>
            {!walletAddress && renderNotConnectedContainer()}
            {walletAddress && renderConnectedContainer()}
          </div>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
