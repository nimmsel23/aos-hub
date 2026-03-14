function alpha_web
    firefox "file:///home/$USER/alpha-os/alpha-os.html"
end

function alpha_api
    # Backend API calls für die Webapp
    curl -X POST localhost:3000/api/$argv[1] -d $argv[2]
end
