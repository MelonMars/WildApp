create trigger "IncrementFinishes"
after INSERT on posts for EACH row
execute FUNCTION increment_finishes();

create trigger award_achievements_trigger
after INSERT on posts for EACH row
execute FUNCTION award_achievements();

create trigger trigger_check_user_level
after INSERT on posts for EACH row
execute FUNCTION check_and_update_user_level();

create trigger user_achievements_trigger
after
update on users for EACH row
execute FUNCTION check_user_achievements ();