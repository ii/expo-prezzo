{
  description = "Run Expo Prezzo Live!";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
  };

  outputs = { self, nixpkgs, flake-utils, devshell }:
    flake-utils.lib.eachDefaultSystem (system:
    let pkgs = import nixpkgs {
          inherit system;
          overlays = [
            devshell.overlays.default
          ];
        };
    in
      {
        devShells.default =
          pkgs.devshell.mkShell {
            packages = [
              pkgs.nodejs_18
            ];
            env = [
              {
                name = "NODE_OPTIONS";
                value = "--openssl-legacy-provider";
              }
              {
               name = ''PORT'';
               value = ''8000'';
              }
            ];
            commands = [
              {
                name = ''start'';
                help = ''starts up prezzo's live server'';
                command = ''setup && npm start'';
              }
              {
                name = ''setup'';
                help = ''ensure everying is installed and ready'';
                command = ''npm install'';
              }
              {
                name = ''new'';
                help = ''Scaffold a new presentation from the template. ex: new collab-culture'';
                command = ''
                PREZZY_DIR=$(git rev-parse --show-toplevel)/static/presentations/$1
                TEMPLATE_DIR=$(git rev-parse --show-toplevel)/template
                mkdir -p $PREZZY_DIR
                cp $TEMPLATE_DIR/presentation.org $PREZZY_DIR
                cp $TEMPLATE_DIR/presentation.json $PREZZY_DIR
                echo "New presentation template '$1' placed at $PREZZY_DIR"
                echo "edit its presentation.org to create the slides"
                echo "edit its presentation.json to control how it looks in our prezzy app"
                echo " have fun!"
               '';
              }
            ];
            motd = ''
            {202}🔨 Welcome to expo prezzo{reset}
            $(type -p menu &>/dev/null && menu)
          '';


          };
      });
}