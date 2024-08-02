import * as anchor from "@coral-xyz/anchor";
import type { Opool } from "../target/types/opool";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Opool as anchor.Program<Opool>;

solana--opool部署
1、使用官方推荐的https://beta.solpg.io/作为部署工具;
2、在右上角导入solana账户;
3、在左下角设置Endpoint选择要部署的网络;
4、选择在EXPLORER的Projects倒数第二个图标导入文件;
5、在左栏选择Build & Deploy;
6、执行build,确认无错后,可以选择在测试网或者开发网执行anchor.test.ts文件
7、当想要部署到网络时选择Deploy,支付足够solana作为GAS后,
当前账户将作为程序(合约)的owner;
8、api讲解及初始化:

1、程序升级者重新设置:
solana program set-upgrade-authority <PROGRAM_ADDRESS> --upgrade-authority <UPGRADE_AUTHORITY_SIGNER> --new-upgrade-authority <NEW_UPGRADE_AUTHORITY>
(https://docs.solanalabs.com/cli/examples/deploy-a-program)

