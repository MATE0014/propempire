export interface RuleSection {
  id: string;
  title: string;
  iconName: "objective" | "setup" | "turn-flow" | "buying" | "rent" | "districts" | "rails" | "utilities" | "houses" | "hotels" | "opportunity" | "empire" | "auctions" | "trading" | "mortgages" | "detention" | "bankruptcy" | "winning";
  content: string;
  example?: string;
}

export const RULES_DATA: RuleSection[] = [
  {
    id: "objective",
    title: "Game Objective",
    iconName: "winning",
    content: "The goal of PropEmpire is to buy, lease, and trade real estate assets to increase your net worth. Dominate the boardroom by forcing all rival players into bankruptcy through strategic district monopoly and smart rental leverage.",
    example: "Win the game instantly when you are the last surviving solvent player at the board."
  },
  {
    id: "setup",
    title: "Initial Setup",
    iconName: "setup",
    content: "Each investor starts the match with a capital balance of ◈1,500 credited to their numerical ledger. Tokens are placed at the START space. Decks of Opportunity and Empire cards are shuffled and placed in the center reserve.",
    example: "All players choose a distinct custom token (Car, Dog, Rocket, etc.) before matches launch."
  },
  {
    id: "turn-flow",
    title: "Turn Flow",
    iconName: "turn-flow",
    content: "On your turn, roll two six-sided dice. Move your token forward clockwise around the 40-space board by the sum of the dice. Land on spaces to trigger actions (purchasing, rent, drawing cards, paying taxes, or serving Detention).",
    example: "If you roll doubles (e.g. 4 and 4), you take your action, and then receive another immediate turn roll. Three consecutive doubles arrests you instantly."
  },
  {
    id: "buying",
    title: "Buying Properties",
    iconName: "buying",
    content: "When landing on an unowned property, rail terminal, or utility company, you have the option to buy it from the Bank at the listed price. Once purchased, you become the title deed owner, allowing you to collect rent from opponents who land on it.",
    example: "Landing on Riverside Boulevard (cost ◈100) allows you to purchase it. If you pass, the property goes to public auction."
  },
  {
    id: "rent",
    title: "Rent Collection",
    iconName: "rent",
    content: "Opponents landing on properties you own must pay rent. Rents scale according to the property district class, the presence of houses or hotels, or the total number of rail terminals and utility systems in your portfolio.",
    example: "Base rent of Stock Exchange St is ◈14. If you own all 3 Financial District properties, the base rent doubles to ◈28."
  },
  {
    id: "districts",
    title: "District Ownership",
    iconName: "districts",
    content: "Properties are grouped into color-coded districts (e.g. Midtown, Financial District). Acquiring every property in a specific district gives you a Monopoly. This double-rents for unimproved spaces and unlocks the ability to build houses and hotels.",
    example: "Crown Plaza has 2 spaces (Prestige Plaza, Empire State Center). Claiming both gives you the Crown district monopoly."
  },
  {
    id: "rails",
    title: "Rail Stations",
    iconName: "rails",
    content: "Four rail terminal spaces are situated around the board (North, East, South, West). Rent scales with the number of terminals owned. 1 Terminal: ◈25 rent; 2 Terminals: ◈50 rent; 3 Terminals: ◈100 rent; 4 Terminals: ◈200 rent.",
    example: "If you own North and East terminals, a player landing on either owes you ◈50."
  },
  {
    id: "utilities",
    title: "Utilities",
    iconName: "utilities",
    content: "Two utility grids are available: Grid Energy Corp and Aqua Flow. Rent scales with the value of the dice roll landed. Owning 1 Utility rents 4x the dice sum; owning both utilities rents 10x the dice sum.",
    example: "If you own both Utilities and an opponent rolls a 7 to land on Grid Energy, rent is 7 * 10 = ◈70."
  },
  {
    id: "houses",
    title: "Building Houses",
    iconName: "houses",
    content: "Once you hold a district monopoly, you can build houses on those properties to increase rents significantly. Houses must be built evenly across properties in a district. You can build up to 4 houses per space before upgrading to a hotel.",
    example: "Building a house on Historic Quarter costs ◈50, boosting rent from ◈4 to ◈20."
  },
  {
    id: "hotels",
    title: "Building Hotels",
    iconName: "hotels",
    content: "After building 4 houses on each property in a district color group, you can pay the upgrade cost to replace them with a premium Hotel. Hotels represent the maximum rent tier for property districts.",
    example: "A Hotel on Empire State Center rents for ◈2,000, paying off the ◈200 upgrade fee instantly on landing."
  },
  {
    id: "opportunity",
    title: "Opportunity Cards",
    iconName: "opportunity",
    content: "Landing on the Opportunity space draws a card from the deck. These cards typically represent market forces, credits transactions, and relocations (similar to Monopoly's Chance cards):\n\n• Advance to Start: Move directly to START and collect your ◈200 salary.\n• Corporate Tax Refund: Collect a ◈150 tax refund payment.\n• Regulatory Fines: Pay a safety violation penalty fee of ◈150.\n• Emergency Relocation: Relocate back by exactly 3 spaces.\n• Capital Upgrades Tax: Pay a levy fee of ◈50 per House and ◈125 per Hotel owned.\n• Corporate Clemency: Keep this clearance card to escape Detention free when needed.",
    example: "Drawing a Corporate Tax Refund grants you ◈150 credits directly from the Reserve bank."
  },
  {
    id: "empire",
    title: "Empire Cards",
    iconName: "empire",
    content: "Empire spaces reward you with powerful, game-changing boardroom actions (similar to Monopoly's Community Chest cards):\n\n• Hostile Takeover: Force the wealthiest opponent to transfer you ◈150.\n• Syndicate Dividends: Collect ◈100 syndicate payouts from every active player.\n• Rent Surge: Upgrade tenant structures. Receive ◈200 from the Reserve bank.\n• Corporate Waiver: Instantly clears any Detention order with lobbying power.",
    example: "Executing Hostile Takeover drains capital from your wealthiest opponent, giving you a double-leverage advantage."
  },
  {
    id: "auctions",
    title: "Public Auctions",
    iconName: "auctions",
    content: "If a player lands on an unowned property and declines to buy it at the bank price, it instantly triggers a public auction. All active players (including the landing player) can bid. Bids start at ◈10. Bidding stays open until a 15-second timer runs out with no higher bids.",
    example: "Sarah lands on Yacht Club Drive but lacks credits. Alex bids ◈120. You outbid at ◈150 to claim it."
  },
  {
    id: "trading",
    title: "Asset Trading",
    iconName: "trading",
    content: "Players can trade assets at any time. Deals can involve transferring credits, properties, rail terminals, utility grids, and detention clearance cards. You can send custom packages and accept/decline incoming offers.",
    example: "You trade Silicon Park to Ryan for ◈300 credits and an Escape Detention Card to complete your Tech Valley monopoly."
  },
  {
    id: "mortgages",
    title: "Mortgages",
    iconName: "mortgages",
    content: "If you need quick capital, you can mortgage your properties for half their buy value. Mortgaged spaces collect zero rent. To unmortgage and gather rent again, you must pay the bank the mortgage value plus a 10% fee.",
    example: "Mortgaging Prestige Plaza grants you ◈175. To unmortgage later, you must pay ◈193."
  },
  {
    id: "detention",
    title: "Detention Rules",
    iconName: "detention",
    content: "You are sent to Detention if you land on Go To Detention, roll doubles three times in a row, or draw arrest cards. While in Detention, you still collect rents but cannot move. Escape by rolling doubles, paying a ◈50 fine, or using an Escape card.",
    example: "If you fail doubles three turns in a row, you are forced to pay the ◈50 fine and exit."
  },
  {
    id: "bankruptcy",
    title: "Bankruptcy",
    iconName: "bankruptcy",
    content: "If you owe more rent or taxes than your balance allows, and you cannot raise funds by selling houses or mortgaging assets, you must declare Bankruptcy. You are eliminated, and all your remaining assets transfer to your creditor.",
    example: "Landing on an opponent's hotel with ◈10 credits forces bankruptcy, gifting them your remaining properties."
  },
  {
    id: "winning",
    title: "Winning",
    iconName: "winning",
    content: "The boardroom game concludes when all opponents have declared bankruptcy, leaving a single solvent investor standing as the ultimate ruler of the PropEmpire.",
    example: "Bankrupting Sarah's last ◈50 balance secures your victory."
  }
];
