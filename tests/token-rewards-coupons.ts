import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { TokenRewardsCoupons } from "../target/types/token_rewards_coupons"
import {
    PublicKey,
    Keypair,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js"
import {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token"
import { findMetadataPda, TokenMetadataProgram } from "@metaplex-foundation/js"

describe("token-rewards-coupons", async () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env())
    const program = anchor.workspace
        .TokenRewardsCoupons as Program<TokenRewardsCoupons>

    const connection = anchor.getProvider().connection
    let userWallet = new PublicKey(
        "EzEV6RerD5yTVSD8qAV4X3igfQwVYRYSYDFT3BPBwHDm"
    )
    const [merchant, merchantBump] = await PublicKey.findProgramAddress(
        [Buffer.from("PROMO"), userWallet.toBuffer()],
        program.programId
    )

    // it("Create a Merchant", async () => {
    //     const [merchant, merchantBump] = await PublicKey.findProgramAddress(
    //         [Buffer.from("PROMO"), userWallet.toBuffer()],
    //         program.programId
    //     );

    //     const tx = await program.methods
    //         .createMerchant("First Merchant")
    //         .accounts({
    //             merchant: merchant,
    //             rent: SYSVAR_RENT_PUBKEY,
    //             systemProgram: SystemProgram.programId,
    //             user: userWallet,
    //         })
    //         .rpc();
    // });

    it("Check Merchant Values:", async () => {
        const merchantAccount = await program.account.merchant.fetch(merchant)
        console.log(merchantAccount.name, merchantAccount.promoCount.toNumber())
    })

    it("Create a Promo:", async () => {
        const merchantAccount = await program.account.merchant.fetch(merchant)
        const [promo, promoBump] = await PublicKey.findProgramAddress(
            [merchant.toBuffer(), merchantAccount.promoCount.toBuffer("be", 8)],
            program.programId
        )
        const [promoMint, promoMintBump] = await PublicKey.findProgramAddress(
            [Buffer.from("MINT"), promo.toBuffer()],
            program.programId
        )
        const metadata = findMetadataPda(promoMint)

        const tx = await program.methods
            .createPromo(
                "https://jsonkeeper.com/b/VQVR",
                "Burger Coupon",
                "BURG"
            )
            .accounts({
                merchant: merchant,
                promo: promo,
                promoMint: promoMint,
                metadata: metadata,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
                tokenMetadataProgram: TokenMetadataProgram.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                user: userWallet,
            })
            .rpc()
    })

    it("Load all promos:", async () => {
        const promos = await program.account.promo.all()

        for (const promo of promos) {
            // console.log(account.account.mint.toString());
            console.log(promo.publicKey.toString())
        }
    })

    // it("Fetch Burger Promo:", async () => {
    //     const burgerPromoPk = new PublicKey("FDFX82yyzz7bRLBpbRWH97GHTLqhfPjnKk3CZpPDiuSF");
    //     const burgerPromo = await program.account.promo.fetch(firstPromoPk);

    //     console.log("Burger promoCnt:", firstPromo, firstPromo.promoCount);
    // });

    // it("Create and Mint Promo", async () => {
    //     const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    //     const [promoCountPda, promoCountBump] = await PublicKey.findProgramAddress(
    //         [Buffer.from("PROMO"), userWallet.publicKey.toBuffer()],
    //         program.programId
    //     );

    //     let count = (await program.account.promo.fetch(promoCountPda)).promoCount;
    //     console.log(count);

    //     const [promoDataPda, promoDataBump] = await PublicKey.findProgramAddress(
    //         [promoCountPda.toBuffer(), count.toBuffer("be", 8)],
    //         program.programId
    //     );

    //     const [promoMintPda, promoMintBump] = await PublicKey.findProgramAddress(
    //         [Buffer.from("MINT"), promoDataPda.toBuffer()],
    //         program.programId
    //     );

    //     const metadataPDA = await findMetadataPda(promoMintPda);

    //     const tx = await program.methods
    //         .createMerchant("https://arweave.net/OwXDf7SM6nCVY2cvQ4svNjtV7WBTz3plbI4obN9JNkk", "NAME", "SYMBOL")
    //         .accounts({
    //             promoCount: promoCountPda,
    //             merchant: promoDataPda,
    //             promoMint: promoMintPda,
    //             user: userWallet.publicKey,
    //             systemProgram: SystemProgram.programId,
    //             rent: SYSVAR_RENT_PUBKEY,
    //             tokenProgram: TOKEN_PROGRAM_ID,
    //             metadata: metadataPDA,
    //             tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //         })
    //         .rpc();
    //     console.log("Your transaction signature", tx);

    //     const payer = Keypair.generate();
    //     const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    //     await connection.confirmTransaction(signature);

    //     const customerNft = await getOrCreateAssociatedTokenAccount(
    //         connection,
    //         payer,
    //         promoMintPda,
    //         userWallet.publicKey
    //     );

    //     console.log(customerNft);

    //     const tx2 = await program.methods
    //         .mintNft()
    //         .accounts({
    //             promoData: promoDataPda,
    //             promoMint: promoMintPda,
    //             tokenProgram: TOKEN_PROGRAM_ID,
    //             user: userWallet.publicKey,
    //             customerNft: customerNft.address,
    //             customer: userWallet.publicKey,
    //         })
    //         // .signers([payer])
    //         .rpc();
    //     console.log("Your transaction signature", tx2);
    // });
})
