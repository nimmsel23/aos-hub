function tacore4
    set -l type $argv[1]
    set -e argv[1]  # entferne ersten Parameter (typ)

    switch $type
        case fitness
            task add $argv project:BODY.Fitness +core4 +fitness due:today rec:weekly
        case fuel
            task add $argv project:BODY.Fuel +core4 +fuel due:today
        case meditate
            task add $argv project:BEING.Meditation +core4 +meditation due:today
        case memoirs
            task add $argv project:BEING.Memoirs +core4 +memoirs due:today
        case partner
            task add $argv project:BALANCE.Partner +core4 +partner due:today
        case balance
            task add $argv project:BALANCE +core4 +posterity due:today
        case discover
            task add $argv project:BUSINESS.Discover +core4 +discover due:today
        case declare
            task add $argv project:BUSINESS.Declare +core4 +declare due:today
    end
end

