import {AlertAteamApiDown} from "../ATeamAlert";
import TopicEntityCreate from "./topic_entity_tag/TopicEntityCreate";
import TopicEntityTable from "./topic_entity_tag/TopicEntityTable";

const BiblioEntity = () => {
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
