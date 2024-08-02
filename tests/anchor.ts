import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  transfer,
} from "@solana/spl-token";
import { Opool } from "../target/types/opool";

import { clusterApiUrl, Connection } from "@solana/web3.js";

import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { web3 } from "@project-serum/anchor";
import type { Opool } from "../target/types/opool";



const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let token_programId = TOKEN_PROGRAM_ID;
let associated_token_programId = ASSOCIATED_TOKEN_PROGRAM_ID;

let user = program.provider.publicKey;
let signer = program.provider.wallet.payer;

let feeReceiver = new web3.Keypair();
let newTokenMes = new web3.Keypair();
let testReceiver = new web3.Keypair();
// Generate keypair for the new account
let thisRecordAccount = new web3.Keypair();
console.log("User pubkey:", user.toString());
console.log("Fee receiver:", feeReceiver.publicKey.toString());
console.log("newTokenMes:", newTokenMes.publicKey.toString());
console.log("testReceiver:", testReceiver.publicKey.toString());
console.log("thisRecordAccount:", thisRecordAccount.publicKey.toString());

const metadataData = {
  name: "SunRise Rainbow Token",
  symbol: "SRT",
  uri: "https://arweave.net/1234",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
};

// async function requestAirdrop(user: PublicKey, connection: Connection) {
//   try {
//     const airdropSignature = await connection.requestAirdrop(
//       user,
//       2 * web3.LAMPORTS_PER_SOL // Requesting 2 SOL
//     );

//     // Confirm the transaction
//     await connection.confirmTransaction(airdropSignature);
//     console.log("Airdrop successful!");
//   } catch (err) {
//     console.error("Airdrop failed:", err);
//   }
// }

// // Request SOL for the user
// await requestAirdrop(user, connection);

// Function to check the SOL balance
async function getBalance(checkAddress: PublicKey) {
  try {
    const balance = await connection.getBalance(checkAddress);
    return balance;
  } catch (err) {
    console.error("Failed to get balance:", err);
  }
}

let userSolBalance1 = await getBalance(user);
console.log(`userSolBalance1: ${userSolBalance1 / web3.LAMPORTS_PER_SOL} SOL`);

//createMint
async function create_mint() {
  const tokenMint = await createMint(
    connection,
    signer,
    user,
    null,
    6,
    newTokenMes,
    null,
    token_programId
  );
  console.log("tokenMint:", tokenMint.toString());
}
await create_mint();

//Make some token metadata
// Generate a new keypair for the mint
async function make_metadata() {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const metadataPDAAndBump = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      newTokenMes.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const metadataPDA = metadataPDAAndBump[0];
  console.log("metadataPDA success");
  const transaction = new Transaction();

  const createMetadataAccountInstruction =
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: newTokenMes.publicKey,
        mintAuthority: user,
        payer: user,
        updateAuthority: user,
      },
      {
        createMetadataAccountArgsV3: {
          collectionDetails: null,
          data: metadataData,
          isMutable: true,
        },
      }
    );

  transaction.add(createMetadataAccountInstruction);

  // send
  try {
    const metadataTxHash = await program.provider.connection.sendTransaction(transaction, [
      signer,
    ]);
    console.log(`Transaction sent`);
    // confirm
    const metadataConfirmation = await program.provider.connection.confirmTransaction(
      metadataTxHash
    );
    console.log(
      `Transaction confirmed: ${metadataTxHash}`,
      metadataConfirmation
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}
await make_metadata();

let userAssociatedAccount: PublicKey;
let destinationTokenAccount: PublicKey;
let feeReceiverAssociated: PublicKey;

//Create an Associated Token Account to store the tokens
async function createAssociatedToken(createAssociateAccount: PublicKey) {
  try {
    const userAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      signer,
      newTokenMes.publicKey,
      createAssociateAccount,
      true,
      null,
      null,
      token_programId,
      associated_token_programId
    );
    return userAssociatedTokenAccount.address;
  } catch (e) {
    console.log("createAssociatedToken:", e);
  }
}
userAssociatedAccount = await createAssociatedToken(user);
console.log(
  "userAssociatedAccount:",
  userAssociatedAccount.toString(),
  "owner:",
  user.toString()
);

destinationTokenAccount = await createAssociatedToken(testReceiver.publicKey);
console.log(
  "destinationTokenAccountInfo:",
  destinationTokenAccount.toString(),
  "owner:",
  testReceiver.publicKey.toString()
);

//mint to
async function mint_to(newToken: PublicKey, receiver: PublicKey) {
  const init_amount = 10000000000;
  try {
    const mintToTx = await mintTo(
      connection,
      signer,
      newToken,
      receiver,
      user,
      init_amount,
      [signer],
      null,
      token_programId
    );
    console.log("mintToTx:", mintToTx);
  } catch (e) {
    console.log("Mint to error:", e);
  }
}
await mint_to(newTokenMes.publicKey, userAssociatedAccount);

//token balance
async function getTokenBalance(checkAddress: PublicKey) {
  try {
    const tokenAccountInfo = await getAccount(connection, checkAddress);
    console.log(`This Account Token balance: ${tokenAccountInfo.amount}`);
  } catch (err) {
    console.error("Failed to get token balance:", err);
  }
}
await getTokenBalance(userAssociatedAccount);

//Transfer token to user
async function transfer_to(receiverAssociatedAccount: PublicKey) {
  try {
    const TransferTokenSignature = await transfer(
      connection,
      signer,
      userAssociatedAccount,
      receiverAssociatedAccount,
      user,
      10000,
      [signer],
      null,
      token_programId
    );
    console.log("transfer_to:", TransferTokenSignature);
  } catch (e) {
    console.log("Transfer error:", e);
  }
}
await transfer_to(destinationTokenAccount);

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Opool as anchor.Program<Opool>;
  
  it("initialize", async () => {
    const fee = new anchor.BN(0);

    const paused = false;

    let newAddress = "E54F5SsYJv44kh5RrP4W42kSuCTe5qxqrRc1oHi1woj";
    const newUpgradeAuthority = new PublicKey(newAddress);

    //setUpgradeAuthority
    // console.log(
    //   "program.programId:",
    //   program.programId.toString(),
    //   "\n",
    //   "web3.SystemProgram.programId:",
    //   web3.SystemProgram.programId.toString()
    // );
    // const BPF_UPGRADE_LOADER_ID = new PublicKey(
    //   "BPFLoaderUpgradeab1e11111111111111111111111"
    // );
    // async function createSetUpgradeAuthority() {
    //   try {
    
    //     // let BPF_LOADER_PROGRAM_ID = anchor.web3.BPF_LOADER_DEPRECATED_PROGRAM_ID;
    
    //     console.log("BPF_UPGRADE_LOADER_ID:", BPF_UPGRADE_LOADER_ID.toBase58());

    //     // 使用 pg.wallet 作为 provider
    //     const provider = new anchor.AnchorProvider(
    //       anchor.getProvider().connection,
    //       pg.wallet,
    //       anchor.AnchorProvider.defaultOptions()
    //     );
    //     anchor.setProvider(provider);

    //     const [programDataAddress] = await PublicKey.findProgramAddress(
    //       [program.programId.toBuffer()],
    //       BPF_UPGRADE_LOADER_ID
    //     );

    //     const setAuthorityIx = new TransactionInstruction({
    //       programId: BPF_UPGRADE_LOADER_ID,
    //       keys: [
    //         {
    //           pubkey: program.programId,
    //           isSigner: false,
    //           isWritable: true,
    //         },
    //         {
    //           pubkey: user,
    //           isSigner: true,
    //           isWritable: false,
    //         },
    //         // {
    //         //   pubkey: newUpgradeAuthority,
    //         //   isSigner: false,
    //         //   isWritable: false,
    //         // },
    //       ],
    //       data: Buffer.concat([
    //         Buffer.from([3]), // SetAuthority instruction identifier
    //         Buffer.from([0]), // 4-byte data type indicator (0 for Upgrade Authority)
    //         newUpgradeAuthority.toBuffer(), // New authority public key
    //       ]),
    //     });
    //     console.log("👋", setAuthorityIx);
    //     // Create a transaction to send the instruction
    //     const tx = new anchor.web3.Transaction().add(setAuthorityIx);
    //     tx.feePayer = user;
    //     tx.recentBlockhash = (
    //       await program.provider.connection.getLatestBlockhash()
    //     ).blockhash;
    //     tx.sign(signer);
    //     console.log("👋👋", tx);
    //     // Send the transaction
    //     const txSignature = await connection.sendRawTransaction(tx.serialize());
    //     await program.provider.connection.confirmTransaction(txSignature, "confirmed");
    //     console.log("👋👋👋");
    //     // Optionally, verify the new authority
    //     const programAccountInfo = await program.provider.connection.getAccountInfo(
    //       program.programId
    //     );
    //     console.log("programAccountInfo:", programAccountInfo);
    //   } catch (e) {
    //     console.log("setUpgradeAuthority error:", e);
    //   }
    // }
    // await createSetUpgradeAuthority();

    //pda生成(maker，owner，manager才需要)
    let [powerUserAuthority, powerUserBump] =
      await PublicKey.findProgramAddress(
        [Buffer.from("power_user_pda"), user.toBuffer()],
        program.programId
      );
    console.log("powerUserAuthority:", powerUserAuthority.toString());
    console.log("powerUserBump:", powerUserBump);

    //initialize（初始化配置owner，fee，feeReceiver，lock）
    let initStateAccount = new web3.Keypair();
    console.log("initStateAccount:", initStateAccount.publicKey.toString());
    try {
      const initTxHash = await program.methods
        .initialize(user, fee, feeReceiver.publicKey, paused)
        .accounts({
          state: initStateAccount.publicKey,
          user: user,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([initStateAccount, signer])
        .rpc();
      console.log(`initialize:${initTxHash}'`);
      // Confirm transaction
      await program.provider.connection.confirmTransaction(initTxHash);

      // Fetch the created account
      const newStateAccount = await program.account.initializeState.fetch(
        initStateAccount.publicKey
      );
      console.log("InitializeState:", "\n",newStateAccount);
    } catch (e) {
      console.log("initTxHash error:", e);
    }

    //transfer upgrade
    // async function SetAuthority() {
    //   try {
    //     const Sysv=new PublicKey("SysvarRent111111111111111111111111111111111");
    //     let [programdataAddress, programdataBump] =
    //       await PublicKey.findProgramAddress(
    //         [program.programId.toBuffer()],
    //         BPF_UPGRADE_LOADER_ID
    //       );
    //     console.log(
    //       "programdataAddress:",
    //       programdataAddress.toBase58(),
    //       "\n",
    //       "programdataBump:",
    //       programdataBump
    //     );

    //     const set_authority = await program.methods
    //       .setAuthority(programdataBump)
    //       .accounts({
    //         currentAuthority: user,
    //         newAuthority: newUpgradeAuthority,
    //         programAddress: program.programId,
    //         programdataAddress: programdataAddress,
    //         systemProgram: web3.SystemProgram.programId,
    //         rent: Sysv,
    //       })
    //       .signers([])
    //       .rpc();
    //     console.log(`set_authority:${set_authority}'`);
    //     // Confirm transaction
    //     await program.provider.connection.confirmTransaction(set_authority);
    //   } catch (e) {
    //     console.log("SetAuthority error:", e);
    //   }
    // }
    // await SetAuthority();

    //为费用接收者找到或者创建token关联账户
    feeReceiverAssociated = await createAssociatedToken(feeReceiver.publicKey);
    console.log(
      "feeReceiverAssociated:",
      feeReceiverAssociated.toString(),
      "owner:",
      feeReceiver.publicKey.toString()
    );

    //SetMakerList（设置maker）
    let makerListAccount = new web3.Keypair();
    console.log("makerListAccount:", makerListAccount.publicKey.toString());
    const setMakerList = await program.methods
      .setMakerList([user], [true])
      .accounts({
        state: initStateAccount.publicKey,
        makerValid: makerListAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([makerListAccount, signer])
      .rpc();
    console.log(`setMakerList:${setMakerList}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setMakerList);

    // Fetch the created account(查找maker的mapping)
    const newMakerValidAccount =
      await program.account.mappingMakerToBool.fetch(
        makerListAccount.publicKey
      );
    console.log("Maker valid account accounts:", newMakerValidAccount.mappings);

    //SetFee（设置费用）
    const newFee = new anchor.BN(100);
    const setFee = await program.methods
      .setFee(newFee)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`setFee:${setFee}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setFee);

    //setFeeReceiver（设置费用接收者）
    const setFeeReceiver = await program.methods
      .setFeeReceiver(feeReceiver.publicKey)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`setFeeReceiver:${setFeeReceiver}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setFeeReceiver);

    //TransferOwner(转移所有者)
    const transferOwner = await program.methods
      .tranferOwner(user)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`transferOwner:${transferOwner}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(transferOwner);

    //SetManagerList（设置manager）
    let managerListAccount = new web3.Keypair();
    console.log("managerListAccount:", managerListAccount.publicKey.toString());
    const setManagerList = await program.methods
      .setManagerList([newTokenMes.publicKey], [user])
      .accounts({
        state: initStateAccount.publicKey,
        tokenToManager: managerListAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([managerListAccount, signer])
      .rpc();
    console.log(`setManagerList:${setManagerList}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setManagerList);
    // Fetch the created account
    const newTokenToManagerAccount =
      await program.account.mappingTokenToManager.fetch(
        managerListAccount.publicKey
      );
    console.log("tokenToManager accounts:", newTokenToManagerAccount.mappings);

    //setTokenReceiver（设置token对应的Receiver）
    let tokenToReceiverAccount = new web3.Keypair();
    console.log(
      "tokenToReceiverAccount:",
      tokenToReceiverAccount.publicKey.toString()
    );
    let newReceiver = new web3.Keypair();
    const setTokenReceiver = await program.methods
      .setTokenReceiver([newTokenMes.publicKey], [newReceiver.publicKey])
      .accounts({
        state: initStateAccount.publicKey,
        tokenToReceiver: tokenToReceiverAccount.publicKey,
        user: user,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([tokenToReceiverAccount, signer])
      .rpc();
    console.log(`setTokenReceiver:${setTokenReceiver}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(setTokenReceiver);
    // Fetch the created account
    const newTokenToReceiverAccount =
      await program.account.mappingTokenToReceiver.fetch(
        tokenToReceiverAccount.publicKey
      );
    console.log(
      "tokenToReceiver accounts:",
      newTokenToReceiverAccount.mappings
    );

    //power user register(owner，maker、manager提取token时，需要先注册（仅注册一次pda）)
    async function register(thisUser, userAuthority, this_signer) {
      try {
        //查找当前用户是否创建了pda，
        let fetchPowerUserRegister = await program.account.powerUser.fetch(
          userAuthority
        );
        console.log("fetchPowerUserRegister:", fetchPowerUserRegister);
      } catch (e) {
        console.log("Power user not register,Ready to execute registration!!!");
        const powerUserRegister = await program.methods
          .withdrawRegister()
          .accounts({
            state: initStateAccount.publicKey,
            tokenToManager: managerListAccount.publicKey,
            makerValid: makerListAccount.publicKey,
            user: thisUser,
            powerUserPda: userAuthority,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: token_programId,
          })
          .signers([this_signer])
          .rpc();
        console.log(`powerUserRegister:${powerUserRegister}'`);
        // Confirm transaction
        await program.provider.connection.confirmTransaction(powerUserRegister);
      }
    }
    //user
    await register(user, powerUserAuthority, signer);
    //user2
    // await register(user2,powerUser2Authority,signer2);

    // let fetchPowerUserRegister;
    // try {
    //   fetchPowerUserRegister = await program.account.powerUser.fetch(
    //     powerUserAuthority
    //   );
    //   console.log("fetchPowerUserRegister:", fetchPowerUserRegister);
    // } catch (e) {
    //   console.log("Power user not register,Ready to execute registration!!!");
    //   const powerUserRegister = await program.methods
    //     .withdrawRegister()
    //     .accounts({
    //       state: initStateAccount.publicKey,
    //       tokenToManager: managerListAccount.publicKey,
    //       makerValid: makerListAccount.publicKey,
    //       user: user,
    //       powerUserPda: powerUserAuthority,
    //       systemProgram: web3.SystemProgram.programId,
    //       tokenProgram: token_programId,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`powerUserRegister:${powerUserRegister}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(powerUserRegister);
    // }

    let powerUserPdaTokenAccount = await createAssociatedToken(
      powerUserAuthority
    );
    console.log(
      "powerUserPdaTokenAccount:",
      powerUserPdaTokenAccount.toString(),
      "owner:",
      powerUserPdaTokenAccount.toString()
    );

    //test in
    // let testAmount = new anchor.BN(100000);
    // try {
    //   const testFn = await program.methods
    //     .testFn(testAmount)
    //     .accounts({
    //       user: signer,
    //       source: userAssociatedAccount,
    //       destination: powerUserPdaTokenAccount,
    //       tokenProgram: token_programId,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`testFn:${testFn}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(testFn);
    //   console.log("testFn success");
    // } catch (e) {
    //   console.log("testFn error:", e);
    // }

    //lock（锁）
    let lock = await program.methods
      .lock(false)
      .accounts({
        state: initStateAccount.publicKey,
        user: user,
      })
      .signers([signer])
      .rpc();
    console.log(`lock:${lock}'`);
    // Confirm transaction
    await program.provider.connection.confirmTransaction(lock);

    async function inbox(thisUser, userAssociated, this_signer) {
      let inAmount = new anchor.BN(100000);
      try {
        const inbox = await program.methods
          .inbox(inAmount)
          .accounts({
            state: initStateAccount.publicKey,
            user: thisUser,
            source: userAssociated,
            destination: powerUserPdaTokenAccount,
            feeDestination: feeReceiverAssociated,
            tokenProgram: token_programId,
            makerValid: makerListAccount.publicKey,
          })
          .signers([this_signer])
          .rpc();
        console.log(`inbox:${inbox}'`);
        // Confirm transaction
        await program.provider.connection.confirmTransaction(inbox);
      } catch (e) {
        console.log("inbox error:", e);
      }
    }
    await inbox(user, userAssociatedAccount, signer);

    //Inbox
    // let inAmount = new anchor.BN(100000);
    // try {
    //   const inbox = await program.methods
    //     .inbox(inAmount)
    //     .accounts({
    //       state: initStateAccount.publicKey,
    //       user: user,
    //       source: userAssociatedAccount,
    //       destination: powerUserPdaTokenAccount,
    //       feeDestination: feeReceiverAssociated,
    //       tokenProgram: token_programId,
    //       makerValid: makerListAccount.publicKey,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`inbox:${inbox}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(inbox);
    // } catch (e) {
    //   console.log("inbox error:", e);
    // }

    // check pool balance
    await getTokenBalance(powerUserPdaTokenAccount);

    //test out
    // let testOutAmount = new anchor.BN(100);
    // try {
    //   const testOut = await program.methods
    //     .testOutFn(testOutAmount, powerUserBump)
    //     .accounts({
    //       user: user,
    //       source: powerUserPdaTokenAccount,
    //       destination: userAssociatedAccount,
    //       contractAuthority: powerUserAuthority,
    //       tokenProgram: token_programId,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`testOut:${testOut}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(testOut);
    // } catch (e) {
    //   console.log("testOut error:", e);
    // }

    async function outbox(
      thisUser,
      userAssociated,
      userAuthority,
      thisUserBump,
      this_signer
    ) {
      let outAmount = new anchor.BN(100);
      try {
        const outbox = await program.methods
          .outbox(outAmount, thisUserBump)
          .accounts({
            state: initStateAccount.publicKey,
            user: thisUser,
            source: powerUserPdaTokenAccount,
            destination: userAssociated,
            contractAuthority: userAuthority,
            tokenProgram: token_programId,
            makerValid: makerListAccount.publicKey,
          })
          .signers([this_signer])
          .rpc();
        console.log(`outbox:${outbox}'`);
        // Confirm transaction
        await program.provider.connection.confirmTransaction(outbox);
      } catch (e) {
        console.log("outbox error:", e);
      }
    }
    //user1
    await outbox(
      user,
      userAssociatedAccount,
      powerUserAuthority,
      powerUserBump,
      signer
    );

    //outbox
    // let outAmount = new anchor.BN(100);
    // try {
    //   const outbox = await program.methods
    //     .outbox(outAmount, powerUserBump)
    //     .accounts({
    //       state: initStateAccount.publicKey,
    //       user: user,
    //       source: powerUserPdaTokenAccount,
    //       destination: userAssociatedAccount,
    //       contractAuthority: powerUserAuthority,
    //       tokenProgram: token_programId,
    //       makerValid: makerListAccount.publicKey,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`outbox:${outbox}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(outbox);
    // } catch (e) {
    //   console.log("outbox error:", e);
    // }

    // check pool balance
    await getTokenBalance(powerUserPdaTokenAccount);

    async function withdraw(
      thisUser,
      userAssociated,
      userAuthority,
      thisUserBump,
      this_signer
    ) {
      let withdrawAmount = new anchor.BN(666);
      try {
        const withdraw = await program.methods
          .withdraw(withdrawAmount, thisUserBump)
          .accounts({
            state: initStateAccount.publicKey,
            user: thisUser,
            source: powerUserPdaTokenAccount,
            destination: userAssociated,
            tokenToManager: managerListAccount.publicKey,
            contractAuthority: userAuthority,
            tokenProgram: token_programId,
          })
          .signers([this_signer])
          .rpc();
        console.log(`withdraw:${withdraw}'`);
        // Confirm transaction
        await program.provider.connection.confirmTransaction(withdraw);
      } catch (e) {
        console.log("Power user withdraw error:", e);
      }
    }
    //user1 withdraw
    await withdraw(
      user,
      userAssociatedAccount,
      powerUserAuthority,
      powerUserBump,
      signer
    );

    //user2 withdraw
    // await withdraw(
    //   user2,
    //   user2AssociatedAccount,
    //   powerUser2Authority,
    //   powerUser2Bump,
    //   signer2
    // );

    //withdraw
    // let withdrawAmount = new anchor.BN(666);
    // try {
    //   const withdraw = await program.methods
    //     .withdraw(withdrawAmount, powerUserBump)
    //     .accounts({
    //       state: initStateAccount.publicKey,
    //       user: user,
    //       source: powerUserPdaTokenAccount,
    //       destination: userAssociatedAccount,
    //       tokenToManager: managerListAccount.publicKey,
    //       contractAuthority: powerUserAuthority,
    //       tokenProgram: token_programId,
    //     })
    //     .signers([signer])
    //     .rpc();
    //   console.log(`withdraw:${withdraw}'`);
    //   // Confirm transaction
    //   await program.provider.connection.confirmTransaction(withdraw);
    // } catch (e) {
    //   console.log("Power user withdraw error:", e);
    // }

    // check pool balance
    await getTokenBalance(powerUserPdaTokenAccount);
  });
});
