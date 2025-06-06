use clap::{Args, Parser, Subcommand};
use owo_colors::OwoColorize;

pub mod common;
pub mod api;
mod commands {
    pub mod init;
    pub mod publish;
    pub mod validate;
}

const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Parser, Debug)]
#[clap(name = "boo", version = VERSION, about = "Uiua package manager")]
struct Cli {
    #[clap(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Init(InitArgs),
    Publish(PublishArgs),
    Validate(ValidationArgs),
    Docs,
    Version,
}

#[derive(Args, Debug)]
struct InitArgs {
    #[clap(default_value = "@foo/bar")]
    package_name: String,
}

#[derive(Args, Debug)]
struct PublishArgs {
    #[clap(
        long,
        help = "Only check is the package is ready for publishing, without uploading it."
    )]
    check: bool,
    #[clap(long, help = "Output the package to a file instead of uploading it.")]
    offline: bool,
}

#[derive(Args, Debug)]
struct ValidationArgs {
    package_file: String,
    #[clap(long, help = "Expected package name for validation.")]
    expect_name: Option<String>,
    #[clap(long, help = "Expected package version for validation.")]
    expect_version: Option<String>,
    #[clap(long, help = "Print validation results in JSON format.")]
    json: bool, 
}

fn main() {
    env_logger::init();
    
    let cli = Cli::parse();
    match cli.command {
        Commands::Init(args) => commands::init::run_init(args),
        Commands::Publish(args) => commands::publish::run_publish(args),
        Commands::Validate(args) => commands::validate::run_validation(args),
        Commands::Docs => {
            panic!("TODO: Implement docs command");
        }
        Commands::Version => {
            println!("Boo v{} - Uiua package manager.", VERSION);
            println!("Find out more at https://uiua.boo/");
        }
    }
}

pub(crate) fn print_success(message: &str) {
    println!("{} {}", "[OK]".green(), message.green());
}

pub(crate) fn print_warning(message: &str) {
    println!("{} {}", "[WARNING]".yellow(), message.yellow());
}

pub(crate) fn print_error(message: &str) {
    println!("{} {}", "[ERROR]".red(), message.red());
}
