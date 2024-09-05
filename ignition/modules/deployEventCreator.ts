import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EventCreatorModule = buildModule("EventCreatorModule", (m) => {

    const EventCreator = m.contract("EventCreator", [], {
    });

    return { EventCreator };
});

export default EventCreatorModule;
