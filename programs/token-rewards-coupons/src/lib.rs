use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instruction::create_metadata_accounts_v2;

declare_id!("37kdkULv7NwBh9QSgv5SYSU3MQSZQwj5BXCUeMys16tF");
#[program]
pub mod token_rewards_coupons {
    use super::*;

    // create a merchant account
    pub fn create_merchant(ctx: Context<CreateMerchant>, name: String) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        merchant.user = ctx.accounts.user.key();
        merchant.name = name;
        merchant.promo_count = 0;

        Ok(())
    }

    // create a new promo
    // init promo_data account to stores promo_mint and promo_bump
    // init promo_mint with metadata
    pub fn create_promo(
        ctx: Context<CreatePromo>,
        uri: String,
        name: String,
        symbol: String,
    ) -> Result<()> {
        let (_pda, bump) = Pubkey::find_program_address(
            &[
                "MINT".as_bytes().as_ref(),
                ctx.accounts.promo.key().as_ref(),
            ],
            ctx.program_id,
        );

        msg!("Create Promo Metadata");
        let promo_data_key = ctx.accounts.promo.key();
        let seeds = &["MINT".as_bytes(), promo_data_key.as_ref(), &[bump]];
        let signer = [&seeds[..]];

        let account_info = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.promo_mint.to_account_info(),
            ctx.accounts.promo_mint.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        invoke_signed(
            &create_metadata_accounts_v2(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.promo_mint.key(),
                ctx.accounts.promo_mint.key(),
                ctx.accounts.user.key(),
                ctx.accounts.user.key(),
                name,
                symbol,
                uri,
                None,
                0,
                true,
                true,
                None,
                None,
            ),
            account_info.as_slice(),
            &signer,
        )?;

        let promo = &mut ctx.accounts.promo;
        promo.user = ctx.accounts.user.key();
        promo.mint = ctx.accounts.promo_mint.key();
        promo.bump = bump;

        let merchant = &mut ctx.accounts.merchant;
        merchant.promo_count += 1;

        Ok(())
    }

    // mint a promo "coupon" token
    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {
        let promo = ctx.accounts.promo.key();

        let seeds = &[
            "MINT".as_bytes(),
            promo.as_ref(),
            &[ctx.accounts.promo.bump],
        ];
        let signer = [&seeds[..]];

        msg!("Minting NFT");
        let cpi_accounts = MintTo {
            mint: ctx.accounts.promo_mint.to_account_info(),
            to: ctx.accounts.customer_nft.to_account_info(),
            authority: ctx.accounts.promo_mint.to_account_info(),
        };
        msg!("CPI Accounts Assigned");
        let cpi_program = ctx.accounts.token_program.to_account_info();
        msg!("CPI Program Assigned");
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &signer);
        msg!("CPI Context Assigned");
        token::mint_to(cpi_ctx, 1)?;
        msg!("Token Minted");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMerchant<'info> {
    #[account(
        init,
        seeds = ["MERCHANT".as_bytes().as_ref(), user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 32 + 1 + 8
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreatePromo<'info> {
    #[account(mut)]
    pub merchant: Account<'info, Merchant>,

    #[account(
        init,
        seeds = [merchant.key().as_ref(), merchant.promo_count.to_be_bytes().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 32 + 1
    )]
    pub promo: Account<'info, Promo>,

    #[account(
        init,
        seeds = ["MINT".as_bytes().as_ref(), promo.key().as_ref()],
        bump,
        payer = user,
        mint::decimals = 0,
        mint::authority = promo_mint,

    )]
    pub promo_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,

    /// CHECK: test
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: test
    pub token_metadata_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    pub promo: Account<'info, Promo>,

    #[account(mut,
        seeds = ["MINT".as_bytes().as_ref(), promo.key().as_ref()],
        bump = promo.bump
    )]
    pub promo_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,

    #[account(mut,
        constraint = customer_nft.mint == promo_mint.key(),
        constraint = customer_nft.owner == user.key()
    )]
    pub customer_nft: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct Merchant {
    pub user: Pubkey,     // 32
    pub name: String,     // 4 + len()
    pub promo_count: u64, // 8
}

#[account]
pub struct Promo {
    pub user: Pubkey,
    pub mint: Pubkey, // 32
    pub bump: u8,     // 1
}
