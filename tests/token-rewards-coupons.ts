import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenRewardsCoupons } from "../target/types/token_rewards_coupons";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { findMetadataPda } from "@metaplex-foundation/js";

describe("token-rewards-coupons", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .TokenRewardsCoupons as Program<TokenRewardsCoupons>;
  const connection = anchor.getProvider().connection;
  const userWallet = anchor.workspace.TokenRewardsCoupons.provider.wallet;

  // it("Create Promo Counter", async () => {
  //   const [promoCountPda, promoCountBump] = await PublicKey.findProgramAddress(
  //     [Buffer.from("PROMO"), userWallet.publicKey.toBuffer()],
  //     program.programId
  //   );

  //   const tx = await program.methods
  //     .createPromoCounter("name")
  //     .accounts({
  //       promoCount: promoCountPda,
  //       user: userWallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //       rent: SYSVAR_RENT_PUBKEY,
  //     })
  //     .rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it("Create and Mint Promo", async () => {
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const [promoCountPda, promoCountBump] = await PublicKey.findProgramAddress(
      [Buffer.from("PROMO"), userWallet.publicKey.toBuffer()],
      program.programId
    );

    let count = await (
      await program.account.promoCount.fetch(promoCountPda)
    ).count;
    console.log(count);

    const [promoDataPda, promoDataBump] = await PublicKey.findProgramAddress(
      [promoCountPda.toBuffer(), count.toBuffer("be", 8)],
      program.programId
    );

    const [promoMintPda, promoMintBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), promoDataPda.toBuffer()],
      program.programId
    );

    const metadataPDA = await findMetadataPda(promoMintPda);

    const tx = await program.methods
      .createPromo(
        "https://arweave.net/OwXDf7SM6nCVY2cvQ4svNjtV7WBTz3plbI4obN9JNkk",
        "NAME",
        "SYMBOL"
      )
      .accounts({
        promoCount: promoCountPda,
        promoData: promoDataPda,
        promoMint: promoMintPda,
        user: userWallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadata: metadataPDA,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    const payer = Keypair.generate();
    const signature = await connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);

    const customerNft = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      promoMintPda,
      userWallet.publicKey
    );

    console.log(customerNft);

    const tx2 = await program.methods
      .mintNft()
      .accounts({
        promoData: promoDataPda,
        promoMint: promoMintPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        user: userWallet.publicKey,
        customerNft: customerNft.address,
        customer: userWallet.publicKey,
      })
      // .signers([payer])
      .rpc();
    console.log("Your transaction signature", tx2);
  });
});
