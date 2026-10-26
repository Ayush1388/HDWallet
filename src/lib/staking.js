// Native Solana staking: create + delegate, deactivate, withdraw.
import {
  Authorized,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  StakeProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { solConnection } from "./chains";

const NOT_DEACTIVATING = "18446744073709551615";

/** Top validators by stake with sane commission. */
export async function getValidators(net) {
  const { current } = await solConnection(net).getVoteAccounts();
  return current
    .filter((v) => v.commission <= 10)
    .sort((a, b) => b.activatedStake - a.activatedStake)
    .slice(0, 8)
    .map((v) => ({
      vote: v.votePubkey,
      node: v.nodePubkey,
      commission: v.commission,
      stake: v.activatedStake / LAMPORTS_PER_SOL,
    }));
}

/** Stake accounts where `owner` is the staker, with a derived state. */
export async function getStakeAccounts(net, owner) {
  const conn = solConnection(net);
  const [accounts, epochInfo] = await Promise.all([
    conn.getParsedProgramAccounts(StakeProgram.programId, {
      filters: [{ memcmp: { offset: 12, bytes: owner } }],
    }),
    conn.getEpochInfo(),
  ]);
  return accounts.map(({ pubkey, account }) => {
    const info = account.data.parsed?.info;
    const d = info?.stake?.delegation;
    let state = "inactive";
    if (d) {
      if (d.deactivationEpoch !== NOT_DEACTIVATING) {
        state = Number(d.deactivationEpoch) < epochInfo.epoch ? "inactive" : "deactivating";
      } else {
        state = Number(d.activationEpoch) >= epochInfo.epoch ? "activating" : "active";
      }
    }
    return {
      address: pubkey.toBase58(),
      lamports: account.lamports,
      sol: account.lamports / LAMPORTS_PER_SOL,
      voter: d?.voter,
      state,
    };
  });
}

export async function createStake(account, votePubkey, solAmount, net) {
  const conn = solConnection(net);
  const payer = Keypair.fromSecretKey(account.sol.secretKey);
  const stakeKp = Keypair.generate();
  const rent = await conn.getMinimumBalanceForRentExemption(StakeProgram.space);
  const lamports = Math.round(solAmount * LAMPORTS_PER_SOL) + rent;
  const tx = new Transaction()
    .add(
      StakeProgram.createAccount({
        fromPubkey: payer.publicKey,
        stakePubkey: stakeKp.publicKey,
        authorized: new Authorized(payer.publicKey, payer.publicKey),
        lamports,
      }),
    )
    .add(
      StakeProgram.delegate({
        stakePubkey: stakeKp.publicKey,
        authorizedPubkey: payer.publicKey,
        votePubkey: new PublicKey(votePubkey),
      }),
    );
  return sendAndConfirmTransaction(conn, tx, [payer, stakeKp]);
}

export async function deactivateStake(account, stakeAddress, net) {
  const payer = Keypair.fromSecretKey(account.sol.secretKey);
  const tx = new Transaction().add(
    StakeProgram.deactivate({ stakePubkey: new PublicKey(stakeAddress), authorizedPubkey: payer.publicKey }),
  );
  return sendAndConfirmTransaction(solConnection(net), tx, [payer]);
}

/** Withdraws the full balance of inactive stake accounts back to the wallet. */
export async function withdrawStake(account, stakes, net) {
  const payer = Keypair.fromSecretKey(account.sol.secretKey);
  const tx = new Transaction();
  for (const s of stakes) {
    tx.add(
      StakeProgram.withdraw({
        stakePubkey: new PublicKey(s.address),
        authorizedPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: s.lamports,
      }),
    );
  }
  return sendAndConfirmTransaction(solConnection(net), tx, [payer]);
}
