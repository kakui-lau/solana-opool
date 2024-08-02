use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("EUQYevBTSDNdVwQLvhiK7LtxHuY7q6HoGN7WNbPa7FKy");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PubkeyPair {
    pub key: Pubkey,
    pub value: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PubkeyBoolPair {
    pub key: Pubkey,
    pub value: bool,
}

#[account]
pub struct MappingTokenToManager {
    pub mappings: Vec<PubkeyPair>,
}

#[account]
pub struct MappingTokenToReceiver {
    pub mappings: Vec<PubkeyPair>,
}

#[account]
pub struct MappingMakerToBool {
    pub mappings: Vec<PubkeyBoolPair>,
}

impl MappingTokenToManager {
    pub fn set(&mut self, key: Pubkey, value: Pubkey) {
        if let Some(pair) = self.mappings.iter_mut().find(|pair| pair.key == key) {
            pair.value = value;
        } else {
            self.mappings.push(PubkeyPair { key, value });
        }
    }

    pub fn get(&self, key: Pubkey) -> Option<Pubkey> {
        self.mappings
            .iter()
            .find(|pair| pair.key == key)
            .map(|pair| pair.value)
    }
}

impl MappingTokenToReceiver {
    pub fn set(&mut self, key: Pubkey, value: Pubkey) {
        if let Some(pair) = self.mappings.iter_mut().find(|pair| pair.key == key) {
            pair.value = value;
        } else {
            self.mappings.push(PubkeyPair { key, value });
        }
    }

    pub fn get(&self, key: Pubkey) -> Option<Pubkey> {
        self.mappings
            .iter()
            .find(|pair| pair.key == key)
            .map(|pair| pair.value)
    }
}

impl MappingMakerToBool {
    pub fn set(&mut self, key: Pubkey, value: bool) {
        if let Some(pair) = self.mappings.iter_mut().find(|pair| pair.key == key) {
            pair.value = value;
        } else {
            self.mappings.push(PubkeyBoolPair { key, value });
        }
    }

    pub fn get(&self, key: Pubkey) -> Option<bool> {
        self.mappings
            .iter()
            .find(|pair| pair.key == key)
            .map(|pair| pair.value)
    }
}

#[program]
mod opool {
    use super::*;

    //
    const INIT_OPERATOR: &str = "EA6giv3FG1KeXNvFQ6n7yby1j1Kbc2qSzNKUoZcNYwMM";

    //initialize
    pub fn initialize(
        ctx: Context<Initialize>,
        owner: Pubkey,
        fee: u64,
        fee_receiver: Pubkey,
        paused: bool,
    ) -> Result<()> {
        let init_state = &mut ctx.accounts.state;
        // require!(
        //     ctx.accounts.user.key().to_string() == INIT_OPERATOR,
        //     ErrorCode::NoPermission
        // );

        require!(!init_state.initialized, ErrorCode::AlreadyInitialized);
        require!(fee <= 10000, ErrorCode::FeeOver10000);

        init_state.owner = owner;
        init_state.fee = fee;
        init_state.fee_receiver = fee_receiver;
        init_state.paused = paused;
        init_state.current_address = *ctx.program_id;
        init_state.initialized = true;

        Ok(())
    }

    //lock
    pub fn lock(ctx: Context<Lock>, lcok_state: bool) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        state.paused = lcok_state;
        emit!(LockEvent {
            state_key: state.key(),
            lock_state: lcok_state,
        });
        Ok(())
    }

    pub fn withdraw_register(ctx: Context<WithdrawRegister>) -> Result<()> {
        let token_to_manager = &mut ctx.accounts.token_to_manager;
        let manager = token_to_manager.get(ctx.accounts.token_program.key());
        let state = &mut ctx.accounts.state;
        let user_key = ctx.accounts.user.key();
        let maker_valid = &mut ctx.accounts.maker_valid;
        let if_maker_valid = maker_valid.get(user_key).unwrap_or(false);
        require!(!state.paused, ErrorCode::ContractPaused);
        //owner || manager || maker
        require!(
            state.owner == user_key || manager == Some(user_key) || if_maker_valid,
            ErrorCode::NoPermission
        );
        Ok(())
    }

    pub fn set_maker_list(
        ctx: Context<SetMakerList>,
        makers: Vec<Pubkey>,
        status: Vec<bool>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        require!(makers.len() == status.len(), ErrorCode::InvalidLength);
        let maker_valid = &mut ctx.accounts.maker_valid;
        for (i, &maker) in makers.iter().enumerate() {
            maker_valid.set(maker, status[i]);
        }
        emit!(ChangeMakers {
            state_key: state.key(),
            new_makers: makers,
        });
        Ok(())
    }

    pub fn set_fee(ctx: Context<SetFee>, new_fee: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        require!(new_fee <= 10000, ErrorCode::InsufficientAmount);
        state.fee = new_fee;
        emit!(FeeChanged {
            owner: ctx.accounts.user.key(),
            new_fee,
        });
        Ok(())
    }

    pub fn set_fee_receiver(ctx: Context<SetFeeReceiver>, new_fee_receiver: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        state.fee_receiver = new_fee_receiver;
        emit!(FeeReceiverChanged {
            owner: ctx.accounts.user.key(),
            new_fee_receiver,
        });
        Ok(())
    }

    pub fn tranfer_owner(ctx: Context<TransferOwner>, new_owner: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        let old_owner = state.owner;
        state.owner = new_owner;
        emit!(OwnerChangeEvent {
            old_owner: old_owner,
            new_owner: new_owner,
        });
        Ok(())
    }

    pub fn set_manager_list(
        ctx: Context<SetManagerList>,
        tokens: Vec<Pubkey>,
        managers: Vec<Pubkey>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        require!(tokens.len() == managers.len(), ErrorCode::InvalidLength);
        let token_to_manager = &mut ctx.accounts.token_to_manager;

        for (i, &address) in managers.iter().enumerate() {
            token_to_manager.set(address, tokens[i]);
        }
        Ok(())
    }

    pub fn set_token_receiver(
        ctx: Context<SetTokenReceiver>,
        tokens: Vec<Pubkey>,
        receivers: Vec<Pubkey>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(
            state.owner == ctx.accounts.user.key(),
            ErrorCode::NoPermission
        );
        require!(tokens.len() == receivers.len(), ErrorCode::InvalidLength);
        let token_to_receiver = &mut ctx.accounts.token_to_receiver;
        for (i, &address) in receivers.iter().enumerate() {
            token_to_receiver.set(address, tokens[i]);
        }
        Ok(())
    }

    pub fn inbox(ctx: Context<Inbox>, amount: u64) -> Result<()> {
        let state = &ctx.accounts.state;
        require!(!state.paused, ErrorCode::ContractPaused);
        let maker_valid = &mut ctx.accounts.maker_valid;
        let if_maker_valid = maker_valid.get(ctx.accounts.user.key()).unwrap_or(false);
        require!(if_maker_valid, ErrorCode::NotMaker);
        let required_fee = state.fee;
        // let fee_amount = amount
        //     .checked_mul(required_fee)
        //     .and_then(|v| v.checked_div(10000))
        //     .ok_or(ErrorCode::Overflow);
        // let real_in_amount = amount.checked_sub(fee_amount).ok_or(ErrorCode::Overflow);
        let fee_amount: u64;
        if required_fee > 0 && amount * required_fee >= 10000 {
            fee_amount = amount * required_fee / 10000;
        } else {
            fee_amount = 0;
        }
        let real_in_amount = amount - fee_amount;

        require!(fee_amount <= real_in_amount, ErrorCode::InvalidFeeAmount);
        //Transfer fee to feeReceiver

        if fee_amount > 0 {
            // Transfer fee to feeReceiver
            let cpi_accounts = Transfer {
                from: ctx.accounts.source.to_account_info(),
                to: ctx.accounts.fee_destination.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, fee_amount)?;

            emit!(InboxFeeEvent {
                token: ctx.accounts.token_program.key(),
                sender: ctx.accounts.user.key(),
                fee_receiver: state.fee_receiver.key(),
                fee_amount: fee_amount,
            });
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, real_in_amount)?;

        emit!(InboxEvent {
            token: ctx.accounts.token_program.key(),
            sender: ctx.accounts.user.key(),
            receiver: ctx.accounts.destination.key(),
            amount: real_in_amount,
        });
        Ok(())
    }

    pub fn outbox(ctx: Context<Outbox>, amount: u64, this_bump: u8) -> Result<()> {
        let state = &ctx.accounts.state;
        let user_key = ctx.accounts.user.key();
        require!(!state.paused, ErrorCode::ContractPaused);
        let maker_valid = &mut ctx.accounts.maker_valid;
        let if_maker_valid = maker_valid.get(user_key).unwrap_or(false);
        require!(if_maker_valid, ErrorCode::NotMaker);

        //Token Transfer
        let seeds = &[b"power_user_pda", user_key.as_ref(), &[this_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.contract_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        emit!(OutboxEvent {
            token: ctx.accounts.token_program.key(),
            sender: ctx.accounts.source.key(),
            receiver: ctx.accounts.destination.key(),
            amount: amount,
        });
        Ok(())
    }

    /**
    pub fn outboxBatch(
        ctx: Context<OutboxBatch>,
        receivers: Vec<Pubkey>,
        amounts: Vec<u64>,
        data: Vec<u8>,
    ) -> Result<()> {
        require!(receivers.len() == amounts.len(), ErrorCode::InvalidLength);
        require!(
            ctx.accounts
                .maker_list
                .contains_key(&ctx.accounts.user.key()),
            ErrorCode::NotMaker
        );

        for (i, &receiver) in receivers.iter().enumerate() {

            let cpi_accounts = Transfer {
                from: ctx.accounts.contract_token_account.to_account_info(),
                to: receiver,
                authority: ctx.accounts.contract_authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, amounts[i])?;

            emit!(OutboxBatchEvent {
                token: ctx.accounts.contract_token_account.key(),
                sneder:
                to: receiver.key(),
                amount: amounts[i],
                data: data.clone(),
            });
        }
        Ok(())
    }
    */

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, this_bump: u8) -> Result<()> {
        let token_to_manager = &mut ctx.accounts.token_to_manager;
        let manager = token_to_manager.get(ctx.accounts.token_program.key());
        let state = &mut ctx.accounts.state;
        let user_key = ctx.accounts.user.key();
        require!(!state.paused, ErrorCode::ContractPaused);
        require!(
            state.owner == user_key || manager == Some(user_key),
            ErrorCode::NoPermission
        );

        let seeds = &[b"power_user_pda", user_key.as_ref(), &[this_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.contract_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        emit!(WithdrawEvent {
            token: ctx.accounts.token_program.key(),
            user: ctx.accounts.user.key(),
            amount: amount,
        });
        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 256
    )]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Lock<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawRegister<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub token_to_manager: Account<'info, MappingTokenToManager>,
    #[account(mut)]
    pub maker_valid: Account<'info, MappingMakerToBool>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + 256 + 1,
        seeds = [b"power_user_pda",user.key().as_ref()],
        bump
    )]
    pub power_user_pda: Account<'info, PowerUser>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetMakerList<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(
        init, 
        payer = user, 
        space = 8 + 256
    )]
    pub maker_valid: Account<'info, MappingMakerToBool>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetFee<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetFeeReceiver<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferOwner<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetManagerList<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(
        init, 
        payer = user, 
        space = 8 + 256
    )]
    pub token_to_manager: Account<'info, MappingTokenToManager>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetTokenReceiver<'info> {
    #[account(mut)]
    pub state: Account<'info, InitializeState>,
    #[account(
        init, 
        payer = user, 
        space = 8 + 256
    )]
    pub token_to_receiver: Account<'info, MappingTokenToReceiver>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Inbox<'info> {
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub maker_valid: Account<'info, MappingMakerToBool>,
}

#[derive(Accounts)]
pub struct Outbox<'info> {
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"power_user_pda",user.key().as_ref()],
        bump
    )]
    pub contract_authority: Account<'info, PowerUser>,
    pub token_program: Program<'info, Token>,
    pub maker_valid: Account<'info, MappingMakerToBool>,
}

// #[derive(Accounts)]
// pub struct OutboxBatch<'info> {
//     pub state: Account<'info, InitializeState>,
//     #[account(mut)]
//     pub user: Signer<'info>,
//     pub contract_token_account: Account<'info, TokenAccount>,
//     pub contract_authority: Signer<'info>,
//     pub token_program: Program<'info, Token>,
//     pub user_to_amount: Account<'info, MappingUserToAmount>,
// }

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub state: Account<'info, InitializeState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub token_to_manager: Account<'info, MappingTokenToManager>,
    #[account(
        mut,
        seeds = [b"power_user_pda",user.key().as_ref()],
        bump
    )]
    pub contract_authority: Account<'info, PowerUser>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct InitializeState {
    pub owner: Pubkey,
    pub current_address: Pubkey,
    pub paused: bool,
    pub fee: u64,
    pub fee_receiver: Pubkey,
    pub initialized: bool,
}

#[account]
pub struct PowerUser {
    pub user: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("No permission to perform this action.")]
    NoPermission,
    #[msg("Initialization has been performed.")]
    AlreadyInitialized,
    #[msg("Insufficient amount.")]
    InsufficientAmount,
    #[msg("Contract is paused.")]
    ContractPaused,
    #[msg("Invalid length.")]
    InvalidLength,
    #[msg("Invalid fee amount")]
    InvalidFeeAmount,
    #[msg("Overflow")]
    Overflow,
    #[msg("Not a maker.")]
    NotMaker,
    #[msg("Fee over 10000.")]
    FeeOver10000,
    #[msg("Not a manager")]
    NotManager,
}

#[event]
pub struct OwnerChangeEvent {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
}

#[event]
pub struct LockEvent {
    pub state_key: Pubkey,
    pub lock_state: bool,
}

#[event]
pub struct ChangeMakers {
    pub state_key: Pubkey,
    pub new_makers: Vec<Pubkey>,
}

#[event]
pub struct InboxEvent {
    pub token: Pubkey,
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
}

#[event]
pub struct InboxFeeEvent {
    pub token: Pubkey,
    pub sender: Pubkey,
    pub fee_receiver: Pubkey,
    pub fee_amount: u64,
}

#[event]
pub struct OutboxEvent {
    pub token: Pubkey,
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
}

#[event]
pub struct OutboxBatchEvent {
    pub token: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct FeeChanged {
    pub owner: Pubkey,
    pub new_fee: u64,
}

#[event]
pub struct FeeReceiverChanged {
    pub owner: Pubkey,
    pub new_fee_receiver: Pubkey,
}

#[event]
pub struct WithdrawEvent {
    pub token: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}
