import {useSelector} from "react-redux";
import {AlertAteamApiDown} from "../ATeamAlert";
import TopicEntityCreateSGD from "./topic_entity_tag/TopicEntityCreateSGD";
import TopicEntityCreate from "./topic_entity_tag/TopicEntityCreate";
import TopicEntityTable from "./topic_entity_tag/TopicEntityTable";

const BiblioEntity = () => {
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
  if (accessLevel === 'SGD') {
    return (
      <>
        <AlertAteamApiDown />
        <TopicEntityCreateSGD key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
    );
  };
    
  return (
      <>
        <AlertAteamApiDown />
        <TopicEntityCreate key="entityCreate" />
        <br/>
        <TopicEntityTable key="entityTable" />
      </>
  );
}

export default BiblioEntity;
