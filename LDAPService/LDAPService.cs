using Application.Common.Exceptions;
using Application.Logic.Auth.Service;
using Microsoft.Extensions.Logging;
using Novell.Directory.Ldap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure
{
    public class LDAPService : ISsoService
    {
        private const string HOST = "tseco.net";
        private const int PORT = 389;
        private const string DOMAIN = "tseco.net";

        private const string ATTR_FIRSTNAME = "givenName";
        private const string ATTR_LASTNAME = "sn";
        private const string ATTR_EMAIL = "mail";
        private const string ATTR_CODE = "title";
        private const string ATTR_DISTINGUISHED_NAME = "distinguishedName";

        private const string DEFAULT_FIRSTNAME = "";
        private const string DEFAULT_LASTNAME = "";
        private const string DEFAULT_EMAIL = "";
        private const string DEFAULT_CODE = "";
        private const string DEFAULT_DISTINGUISHED_NAME = "";

        private const string KEY_TO_SEARCH = "SamAccountName";

        private static readonly string[] requestAttribute = { ATTR_FIRSTNAME, ATTR_LASTNAME, ATTR_EMAIL, ATTR_CODE, ATTR_DISTINGUISHED_NAME };
        private readonly ILogger<LDAPService> logger;

        public LDAPService(ILogger<LDAPService> logger)
        {
            this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<bool> CheckCredential(string username, string password)
        {
            using (var cn = new LdapConnection())
            {
                cn.Connect(HOST, PORT);

                //Check Username and password
                try
                {
                    cn.Bind(username + "@" + DOMAIN, password);
                }
                catch (LdapException ex) when (ex.ResultCode == LdapException.InvalidCredentials)
                {
                    logger.LogDebug($"Credential is invalid for {username}");
                    return false;
                }
                catch (Exception ex)
                {
                    logger.LogWarning($"Credential is invalid for {username}");
                    return false;
                }

                return true;
            }
        }

        public async Task<UserInfo> GetUser(string username)
        {
            using (var cn = new LdapConnection())
            {
                cn.Constraints.ReferralFollowing = true;
                cn.SearchConstraints.ReferralFollowing = true;

                cn.Connect(HOST, PORT);

                cn.Constraints.ReferralFollowing = true;
                cn.SearchConstraints.ReferralFollowing = true;
                try
                {
                    cn.Bind("food@tseco", "x7n33d5or28s)(*POI");
                }
                catch (LdapException ex) when (ex.ResultCode == LdapException.InvalidCredentials)
                {
                    logger.LogCritical($"Credential is invalid for food user!");
                    throw new Exception($"Credential is invalid for food user!");
                }

                try
                {
                    List<string> dns = new List<string>()
                    {
                        "dc=tseco,dc=net",
                    };

                    foreach (var dnBaseToSearch in dns)
                    {
                        LdapEntry entry;
                        try
                        {
                            var searchResult = cn.Search(dnBaseToSearch, LdapConnection.ScopeSub, $"({KEY_TO_SEARCH}={username})", requestAttribute, false);

                            try
                            {
                                if (searchResult.HasMore() == false)
                                {
                                    logger.LogDebug($"{username} not found in {dnBaseToSearch} by throwing NoSuchObject exception.");
                                    continue;
                                }

                                entry = searchResult.Next();
                            }
                            catch (LdapException ex) when (ex.ResultCode == LdapException.NoSuchObject)
                            {
                                logger.LogDebug($"{username} not found in {dnBaseToSearch} by throwing NoSuchObject exception.");
                                continue;
                            }
                        }
                        catch (LdapException ex)
                        {
                            logger.LogDebug(ex.Message);
                            continue; // Ignore any error. maybe this is not important and can find user in another dn
                        }

                        logger.LogDebug($"[{username}] found in {dnBaseToSearch}");

                        var attrSet = entry.GetAttributeSet();

                        var Firstname = attrSet.ContainsKey(ATTR_FIRSTNAME) ? attrSet.GetAttribute(ATTR_FIRSTNAME)?.StringValue ?? DEFAULT_FIRSTNAME : DEFAULT_FIRSTNAME;
                        var Lastname = attrSet.ContainsKey(ATTR_LASTNAME) ? attrSet.GetAttribute(ATTR_LASTNAME)?.StringValue ?? DEFAULT_LASTNAME : DEFAULT_LASTNAME;
                        var Email = attrSet.ContainsKey(ATTR_EMAIL) ? attrSet.GetAttribute(ATTR_EMAIL)?.StringValue ?? DEFAULT_EMAIL : DEFAULT_EMAIL;
                        var Code = attrSet.ContainsKey(ATTR_CODE) ? attrSet.GetAttribute(ATTR_CODE)?.StringValue ?? DEFAULT_CODE : DEFAULT_CODE;
                        var Distinguised = attrSet.ContainsKey(ATTR_DISTINGUISHED_NAME) ? attrSet.GetAttribute(ATTR_DISTINGUISHED_NAME)?.StringValue ?? DEFAULT_DISTINGUISHED_NAME : DEFAULT_DISTINGUISHED_NAME;

                        int codeAsNumber;
                        if (int.TryParse(Code, out codeAsNumber) == false)
                        {
                            logger.LogError($"Missing User Code: {username}");
                            throw new BadRequestException("کد پرسنلی شما در Active Directory ثبت نشده است. با داخلی 217 تماس بگیرید.");
                        }

                        return new UserInfo()
                        {
                            Code = codeAsNumber,
                            Email = Email,
                            Firstname = Firstname,
                            Lastname = Lastname,
                            Path = Distinguised,
                            Username = username
                        };
                    }

                    return null;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex.Message);
                    throw;
                }
            }
        }
    }
}