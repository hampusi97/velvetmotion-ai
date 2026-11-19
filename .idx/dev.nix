{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.python311
  ];
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "bradlc.vscode-tailwindcss"
    ];
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "node" "scripts/run-cloud-dev.mjs" ];
          manager = "web";
          env = {
            PORT = "$PORT";
            HOST = "0.0.0.0";
          };
        };
      };
    };
  };
}
