import React, { useState ,useEffect} from 'react'
import { generateMnemonic, mnemonicToSeed } from "bip39";
import nacl from "tweetnacl";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { Wallet, HDNodeWallet } from "ethers";


import process from 'process';
window.process = process;
import { Buffer } from 'buffer';
window.Buffer = Buffer;


const App = () => {
  const [showSeed, setShowSeed] = useState(false);
    const [mnemonic, setMnemonic] = useState("");
    const[currentIndex,setCurrentIndex] = useState(0);
    const [wallets, setWallets] = useState([]);
    const [visible, setVisible] = useState({});

    
    // 🔹 Load data from localStorage on mount
  useEffect(() => {
    const savedMnemonic = localStorage.getItem("mnemonic");
    const savedWallets = JSON.parse(localStorage.getItem("wallets") || "[]");
    const savedIndex = parseInt(localStorage.getItem("currentIndex") || "0", 10);

    if (savedMnemonic) {
      setMnemonic(savedMnemonic);
      setWallets(savedWallets);
      setCurrentIndex(savedIndex);
    }
  }, []);

  // 🔹 Save to localStorage whenever mnemonic, wallets, or index change
  useEffect(() => {
    if (mnemonic) {
      localStorage.setItem("mnemonic", mnemonic);
      localStorage.setItem("wallets", JSON.stringify(wallets));
      localStorage.setItem("currentIndex", currentIndex.toString());
    }
  }, [mnemonic, wallets, currentIndex]);



const generateWallet = async() => {

    const newMnemonic = generateMnemonic();
    setMnemonic(newMnemonic);
    console.log("Generated Mnemonic" , newMnemonic);
    //passing it directly because setMnemonic is a async function
    //it possible that when the addaccount is called mnemonic can be empty

    await addAccount(newMnemonic);

}

const addAccount = async(mn)=> {

    const seed = await mnemonicToSeed(mn);

    // solana
    const solPath = `m/44'/501'/${currentIndex}'/0'`;
    const solDerived = derivePath(solPath,seed.toString("hex"))
    const solSecret = nacl.sign.keyPair.fromSeed(solDerived.key).secretKey;
    const solkeypair = Keypair.fromSecretKey(solSecret);

    //ethereum
    const ethPath = `m/44'/60'/${currentIndex}'/0'`;
    const hdNode = HDNodeWallet.fromSeed(seed);
    const child = hdNode.derivePath(ethPath);
    const ethWallet = new Wallet(child.privateKey);

    // Store both as one entry
    const newWallet = {
      id: crypto.randomUUID(), 
      index: currentIndex,
      ethAddress: ethWallet.address,
      solAddress: solkeypair.publicKey.toBase58(),
      ethPrivateKey: ethWallet.privateKey,
      solPrivateKey: Buffer.from(solkeypair.secretKey).toString('hex'), // converting Uint8Array to hex string

    };

    setWallets([...wallets, newWallet]);
    setCurrentIndex(currentIndex + 1);
  }


  const deleteWallet=async() => {
    setMnemonic("");
    setWallets([]);
     setCurrentIndex(0);
     localStorage.clear();
    
  }

const toggleKeyVisibility = (id, type) => {
  setVisible(prev => {
    const walletVisibility = prev[id] || { eth: false, sol: false };
    const newValue = !walletVisibility[type];
    console.log("Toggling", id, type, "=>", newValue);
    return {
      ...prev,
      [id]: {
        ...walletVisibility,
        [type]: newValue,
      },
    };
  });
};


  const deleteAccount=async(id)=>{
     setWallets((prev)=>prev.filter(W => W.id !== id));
  }






  return (
    <div className='bg-black min-h-screen'>

      {/* no wallet is there no this is the first page */}

      {!mnemonic && (
        <>
        <h2 className=' mt-20 text-center text-5xl font-semibold font-mono
         text-white '> Step Into the Future of Finance </h2>

        <p className="mt-10 font-semibold text-lg font-mono text-gray-300
         max-w-2xl mx-auto">Generate a secure crypto wallet in seconds and take full control of your digital assets. 
           Manage Ethereum and Solana accounts with one simple interface.</p>

        <div className='flex items-center justify-center'> 

          <button className='mt-20 mx-4 py-2 px-4 rounded-xl border  border-white bg-white 
        text-black font-mono font-bold hover:scale-105 transition-all duration-200' 
          onClick={generateWallet}>Generate Wallet</button>

       </div>
        </>
      )}
      
      
      
      <div className='flex flex-col  mx-40 mt-10  '>
      {mnemonic && (
        <>
          <div className=" mt-6 flex f justify-between">
             <h1 className=" text-2xl font-mono 
              font-semibold mb-4  cursor-pointer" 
             onClick={() => setShowSeed(!showSeed)}
             >Your Seed Phrase</h1>
             <div className=''>
          <button
                className='inline-flex items-center justify-center text-sm mx-4 py-2 px-2 rounded-md border border-white bg-white 
                text-black font-medium hover:scale-105 transition-all duration-200' 
                onClick ={deleteWallet}>
                Delete Wallet
        </button>

            <button 
                className=' inline-flex items-center justify-center text-sm mx-4 py-2 px-2 rounded-md border border-white bg-white 
                text-black font-medium hover:scale-105 transition-all duration-200 '
                onClick={()=> addAccount(mnemonic)}>
                New Account
         </button>
         </div>
         </div>

          <div    className={`grid grid-cols-3 sm:grid-cols-4 gap-2 transform transition-all duration-500 ease-in-out ${
                  showSeed ? "opacity-100 scale-100" : "opacity-0 -translate-y-2 max-h-0 pointer-events-none "}`}>
                  {mnemonic.split(" ").map((word, index) => (
                  <div className='rounded-lg px-20 py-4 text-lg font-mono mt-2
                  '> {word}
                    </div>
         
      ))}
           </div>
          
            
            </>
    )}
    </div>

      
      {mnemonic && (

        <div className=" gap-2 mb-4 mx-40">

      

        {wallets.map((W)=> (
      
        <div key={W.id}>
          <div className='bg-[#181818] rounded-md mt-4 py-6 px-6 flex flex-col gap-2' >
          <div className='text-4xl font-mono mb-4 font-semibold ' >Wallet {W.index}</div >

          <div className='border border-black bg-black rounded-md py-4 px-4'>
          <div className='text-xl font-mono mb-2'>ETH Public Key:</div>
          <div className='text-xl font-mono  mb-2 '> {W.ethAddress}</div>
          <div className=''>
              <div className='text-xl font-mono mb-2'> ETH Private Key:</div>
              <input className=' text-l w-auto font-mono inline-flex items-center justify-center bg-black font-white mx-2'
              type = {visible[W.id]?.eth ? "text":"password"}
              value={W.ethPrivateKey}
              size={W.ethPrivateKey.length}
              readOnly
              />
              <button className='  inline-flex items-center justify-center text-sm mx-4 py-2 px-2 rounded-md border border-white bg-white 
                text-black font-medium hover:scale-105 transition-all duration-200 '
                onClick={() => toggleKeyVisibility(W.id,"eth")}>
                {visible[W.id]?.eth ? "hide":"Show"}
              </button>
        </div>
        </div>
        <div className='border border-black bg-black rounded-md py-4 px-4'>
        <div className='text-xl font-mono mb-2'>Solana Public Key</div>
          <div className='text-xl font-mono mb-2'> {W.solAddress}</div>
          <div className='' >
              <div className='text-xl font-mono mb-2 '>SOL Private Key: </div>
              <input className='text-l w-auto font-mono inline-flex items-center justify-center bg-black font-white mx-2 mb-4'
              type = {visible[W.id]?.sol ? "text":"password"}
              value={W.solPrivateKey}
              size={W.ethPrivateKey.length}
              readOnly
              />
              <button className=' inline-flex items-center justify-center text-sm mx-4 py-2 px-2 rounded-md border border-white bg-white 
                text-black font-medium hover:scale-105 transition-all duration-200 '
                onClick={() => toggleKeyVisibility(W.id,"sol")}>
                {visible[W.id]?.sol ? "hide":"Show"}
              </button>
        </div>
       </div>
       <div className='flex justify-end mt-2'>
         <button className='  inline-flex items-center justify-center text-sm  py-2 px-2 rounded-md border border-white bg-white 
                text-black font-medium hover:scale-105 transition-all duration-200'
         onClick={() => deleteAccount(W.id)}>Delete Account</button>
          </div>
            </div>
         </div>
      ))}
      </div>
     
      )}
      </div>
      
  )
}
    
  

  
    


export default App
